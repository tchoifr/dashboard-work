use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("7ztZfuYcFzPF4tgy1iFkHhTNSowKFPGdUx3QNoGg12Re");

// Brn2npkdBZjnhS4VSFNYbLWCBZ5n7hakVcnpNGxzXosJ
pub const FEE_WALLET_PUBKEY: Pubkey = Pubkey::new_from_array([
    157, 97, 38, 69, 64, 110, 141, 128, 10, 2, 230, 210, 227, 254, 227, 92,
    63, 91, 63, 222, 97, 251, 191, 234, 143, 38, 30, 180, 166, 130, 74, 118,
]);

// 15% total en cas de litige (7.5% / admin si 2 admins)
pub const DISPUTE_FEE_BPS: u16 = 1500;

#[program]
pub mod escrow_program {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        contract_id: [u8; 32],
        amount: u64,
        fee_bps: u16, // attendu = 500
        admin_one: Pubkey,
        admin_two: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);
        require!(fee_bps <= 10_000, EscrowError::InvalidFeeBps);

        // (Optionnel) verrouiller à 5% exactement :
        // require!(fee_bps == 500, EscrowError::InvalidFeeBps);

        let escrow = &mut ctx.accounts.escrow_state;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.worker = ctx.accounts.worker.key();
        escrow.contract_id = contract_id;

        escrow.admin1 = admin_one;
        escrow.admin2 = admin_two;

        escrow.vault = ctx.accounts.vault.key();
        escrow.usdc_mint = ctx.accounts.usdc_mint.key();

        escrow.fee_bps = fee_bps;
        escrow.fee_wallet = FEE_WALLET_PUBKEY;

        escrow.status = EscrowStatus::Initialized;
        escrow.finalized = false;

        escrow.employer_approved = false;
        escrow.worker_approved = false;

        escrow.admin1_voted = false;
        escrow.admin2_voted = false;
        escrow.votes_for_worker = 0;
        escrow.votes_for_employer = 0;
        escrow.resolved_for_worker = None;

        escrow.bump = ctx.bumps.escrow_state;
        escrow.vault_bump = ctx.bumps.vault;

        // ---- FEE DIRECTE À LA CRÉATION ----
        let fee = (amount as u128)
            .checked_mul(fee_bps as u128)
            .ok_or(EscrowError::MathError)?
            / 10_000u128;

        let fee_u64 = fee as u64;
        let to_vault = amount.checked_sub(fee_u64).ok_or(EscrowError::MathError)?;

        // IMPORTANT : le vault ne contiendra QUE le montant net (sans les 5%)
        escrow.amount = to_vault;

        // Vérifs du compte fee (Bynhex ATA USDC)
        require!(
            ctx.accounts.admin_fee_account.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.admin_fee_account.owner == escrow.fee_wallet,
            EscrowError::BadOwner
        );

        // 1) payer -> byhnex (fee)
        if fee_u64 > 0 {
            let cpi_fee = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.initializer_usdc_ata.to_account_info(),
                    to: ctx.accounts.admin_fee_account.to_account_info(),
                    authority: ctx.accounts.initializer.to_account_info(),
                },
            );
            token::transfer(cpi_fee, fee_u64)?;
        }

        // 2) payer -> vault (net)
        let cpi_vault = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.initializer_usdc_ata.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.initializer.to_account_info(),
            },
        );
        token::transfer(cpi_vault, to_vault)?;

        Ok(())
    }

    pub fn worker_accept(ctx: Context<WorkerAccept>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Initialized, EscrowError::BadStatus);
        require!(ctx.accounts.worker.key() == escrow.worker, EscrowError::Unauthorized);

        escrow.status = EscrowStatus::Accepted;
        Ok(())
    }

    pub fn employer_approve_completion(ctx: Context<EmployerApproveCompletion>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Accepted, EscrowError::BadStatus);
        require!(
            ctx.accounts.initializer.key() == escrow.initializer,
            EscrowError::Unauthorized
        );

        escrow.employer_approved = true;
        Ok(())
    }

    pub fn worker_approve_completion(ctx: Context<WorkerApproveCompletion>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Accepted, EscrowError::BadStatus);
        require!(ctx.accounts.worker.key() == escrow.worker, EscrowError::Unauthorized);

        escrow.worker_approved = true;
        Ok(())
    }

    /// Release normal (pas de litige) :
    /// -> tout le vault (montant NET) au worker
    /// -> Bynhex a déjà pris 5% à la création
    pub fn release_if_both_approved(ctx: Context<ReleaseIfBothApproved>) -> Result<()> {
        let escrow_ro = &ctx.accounts.escrow_state;

        require!(!escrow_ro.finalized, EscrowError::AlreadyFinalized);
        require!(escrow_ro.status == EscrowStatus::Accepted, EscrowError::BadStatus);
        require!(
            escrow_ro.employer_approved && escrow_ro.worker_approved,
            EscrowError::NotBothApproved
        );

        // Vérifs destination worker ATA
        require!(
            ctx.accounts.worker_usdc_ata.mint == escrow_ro.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.worker_usdc_ata.owner == escrow_ro.worker,
            EscrowError::BadOwner
        );

        // signer = escrow_state PDA
        let bump_seed = [escrow_ro.bump];
        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow_ro.initializer.as_ref(),
            escrow_ro.worker.as_ref(),
            escrow_ro.contract_id.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: [&[&[u8]]; 1] = [seeds];

        let escrow_state_info = ctx.accounts.escrow_state.to_account_info();

        // vault -> worker (tout)
        let cpi_worker = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.worker_usdc_ata.to_account_info(),
                authority: escrow_state_info,
            },
            &signer_seeds,
        );
        token::transfer(cpi_worker, escrow_ro.amount)?;

        let escrow = &mut ctx.accounts.escrow_state;
        escrow.status = EscrowStatus::Released;
        escrow.finalized = true;
        escrow.resolved_for_worker = Some(true);

        Ok(())
    }

    pub fn open_dispute(ctx: Context<OpenDispute>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);

        let signer = ctx.accounts.signer.key();
        require!(
            signer == escrow.initializer || signer == escrow.worker,
            EscrowError::Unauthorized
        );

        require!(escrow.status == EscrowStatus::Accepted, EscrowError::BadStatus);

        escrow.status = EscrowStatus::Dispute;

        escrow.admin1_voted = false;
        escrow.admin2_voted = false;
        escrow.votes_for_worker = 0;
        escrow.votes_for_employer = 0;
        escrow.resolved_for_worker = None;

        Ok(())
    }

    pub fn admin_vote(ctx: Context<AdminVote>, vote_for_worker: bool) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Dispute, EscrowError::BadStatus);

        let admin = ctx.accounts.admin.key();

        if admin == escrow.admin1 {
            require!(!escrow.admin1_voted, EscrowError::AlreadyVoted);
            escrow.admin1_voted = true;
        } else if admin == escrow.admin2 {
            require!(!escrow.admin2_voted, EscrowError::AlreadyVoted);
            escrow.admin2_voted = true;
        } else {
            return err!(EscrowError::Unauthorized);
        }

        if vote_for_worker {
            escrow.votes_for_worker = escrow.votes_for_worker.saturating_add(1);
        } else {
            escrow.votes_for_employer = escrow.votes_for_employer.saturating_add(1);
        }

        Ok(())
    }

    /// Litige résolu pour le worker :
    /// - prélève 15% du vault
    /// - 7.5% -> admin1 ATA
    /// - 7.5% -> admin2 ATA
    /// - reste -> worker
    pub fn release_to_worker(ctx: Context<ReleaseToWorker>) -> Result<()> {
        let escrow_ro = &ctx.accounts.escrow_state;

        require!(!escrow_ro.finalized, EscrowError::AlreadyFinalized);
        require!(escrow_ro.status == EscrowStatus::Dispute, EscrowError::BadStatus);

        require!(
            escrow_ro.admin1_voted && escrow_ro.admin2_voted,
            EscrowError::NotEnoughVotes
        );
        require!(
            escrow_ro.votes_for_worker > escrow_ro.votes_for_employer,
            EscrowError::VoteNotForWorker
        );

        let admin = ctx.accounts.admin.key();
        require!(admin == escrow_ro.admin1 || admin == escrow_ro.admin2, EscrowError::Unauthorized);

        // Vérifs worker ATA
        require!(
            ctx.accounts.worker_usdc_ata.mint == escrow_ro.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.worker_usdc_ata.owner == escrow_ro.worker,
            EscrowError::BadOwner
        );

        // Vérifs admin ATAs (doivent appartenir aux admin pubkeys enregistrées)
        require!(
            ctx.accounts.admin1_usdc_ata.mint == escrow_ro.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.admin1_usdc_ata.owner == escrow_ro.admin1,
            EscrowError::BadOwner
        );

        require!(
            ctx.accounts.admin2_usdc_ata.mint == escrow_ro.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.admin2_usdc_ata.owner == escrow_ro.admin2,
            EscrowError::BadOwner
        );

        // Calcul dispute fee
        let dispute_fee = (escrow_ro.amount as u128)
            .checked_mul(DISPUTE_FEE_BPS as u128)
            .ok_or(EscrowError::MathError)?
            / 10_000u128;

        let dispute_fee_u64 = dispute_fee as u64;
        let to_admin_each = dispute_fee_u64 / 2;
        let to_worker = escrow_ro
            .amount
            .checked_sub(to_admin_each.checked_mul(2).ok_or(EscrowError::MathError)?)
            .ok_or(EscrowError::MathError)?;

        // signer = escrow_state PDA
        let bump_seed = [escrow_ro.bump];
        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow_ro.initializer.as_ref(),
            escrow_ro.worker.as_ref(),
            escrow_ro.contract_id.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: [&[&[u8]]; 1] = [seeds];

        let escrow_state_info = ctx.accounts.escrow_state.to_account_info();

        // vault -> admin1
        if to_admin_each > 0 {
            let cpi_a1 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin1_usdc_ata.to_account_info(),
                    authority: escrow_state_info.clone(),
                },
                &signer_seeds,
            );
            token::transfer(cpi_a1, to_admin_each)?;

            // vault -> admin2
            let cpi_a2 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin2_usdc_ata.to_account_info(),
                    authority: escrow_state_info.clone(),
                },
                &signer_seeds,
            );
            token::transfer(cpi_a2, to_admin_each)?;
        }

        // vault -> worker (reste)
        let cpi_worker = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.worker_usdc_ata.to_account_info(),
                authority: escrow_state_info,
            },
            &signer_seeds,
        );
        token::transfer(cpi_worker, to_worker)?;

        let escrow = &mut ctx.accounts.escrow_state;
        escrow.status = EscrowStatus::Released;
        escrow.finalized = true;
        escrow.resolved_for_worker = Some(true);

        Ok(())
    }

    /// Litige résolu pour l'employer (pas d'annulation => on ne “refund” pas)
    /// Ici : on envoie TOUT au worker ou on bloque ? (tu as dit : pas d'annulation)
    /// => on bloque l'action explicitement.
    pub fn refund_to_employer(_ctx: Context<RefundToEmployer>) -> Result<()> {
        // Pas d'annulation / pas de refund dans tes règles
        err!(EscrowError::RefundNotAllowed)
    }
}

#[derive(Accounts)]
#[instruction(contract_id: [u8; 32])]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// CHECK: worker ne signe pas
    pub worker: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [
            b"escrow",
            initializer.key().as_ref(),
            worker.key().as_ref(),
            contract_id.as_ref()
        ],
        bump
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"vault", escrow_state.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_state
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = initializer_usdc_ata.owner == initializer.key() @ EscrowError::BadOwner,
        constraint = initializer_usdc_ata.mint == usdc_mint.key() @ EscrowError::BadMint
    )]
    pub initializer_usdc_ata: Account<'info, TokenAccount>,

    // ATA USDC de BYHNEX (owner = FEE_WALLET_PUBKEY)
    #[account(mut)]
    pub admin_fee_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WorkerAccept<'info> {
    pub worker: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct EmployerApproveCompletion<'info> {
    pub initializer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct WorkerApproveCompletion<'info> {
    pub worker: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct ReleaseIfBothApproved<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.key().as_ref()],
        bump = escrow_state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub worker_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct AdminVote<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct ReleaseToWorker<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.key().as_ref()],
        bump = escrow_state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub worker_usdc_ata: Account<'info, TokenAccount>,

    // ATAs USDC des admins
    #[account(mut)]
    pub admin1_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin2_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundToEmployer<'info> {
    // conservé pour compat, mais interdit
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.initializer.as_ref(),
            escrow_state.worker.as_ref(),
            escrow_state.contract_id.as_ref(),
        ],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub initializer: Pubkey,
    pub worker: Pubkey,
    pub contract_id: [u8; 32],

    pub admin1: Pubkey,
    pub admin2: Pubkey,

    pub vault: Pubkey,
    pub usdc_mint: Pubkey,

    // Montant NET stocké dans le vault (après fee Bynhex)
    pub amount: u64,

    // Fee Bynhex (5% en pratique)
    pub fee_bps: u16,
    pub fee_wallet: Pubkey,

    pub status: EscrowStatus,

    pub employer_approved: bool,
    pub worker_approved: bool,

    pub admin1_voted: bool,
    pub admin2_voted: bool,
    pub votes_for_worker: u8,
    pub votes_for_employer: u8,

    pub finalized: bool,
    pub resolved_for_worker: Option<bool>,

    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Initialized,
    Accepted,
    Dispute,
    Released,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Montant invalide")]
    InvalidAmount,
    #[msg("FeeBps invalide")]
    InvalidFeeBps,
    #[msg("Non autorisé")]
    Unauthorized,
    #[msg("Mauvais status pour cette action")]
    BadStatus,
    #[msg("Déjà finalisé")]
    AlreadyFinalized,
    #[msg("Pas validé par les deux")]
    NotBothApproved,
    #[msg("Déjà voté")]
    AlreadyVoted,
    #[msg("Votes insuffisants")]
    NotEnoughVotes,
    #[msg("Le vote ne favorise pas le worker")]
    VoteNotForWorker,
    #[msg("Le vote ne favorise pas l'employer")]
    VoteNotForEmployer,
    #[msg("Mint invalide")]
    BadMint,
    #[msg("Owner invalide")]
    BadOwner,
    #[msg("Erreur de calcul")]
    MathError,
    #[msg("Refund interdit (pas d'annulation)")]
    RefundNotAllowed,
}
