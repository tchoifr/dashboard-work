use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use std::str::FromStr;

declare_id!("7ztZfuYcFzPF4tgy1iFkHhTNSowKFPGdUx3QNoGg12Re");

/// Fee wallet fixe (pubkey constant, pas de parsing on-chain)
pub const FEE_WALLET: &str = "Brn2npkdBZjnhS4VSFNYbLWCBZ5n7hakVcnpNGxzXosJ";

#[program]
pub mod escrow_program {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        contract_id: [u8; 32],
        amount: u64,
        fee_bps: u16,
        admin_one: Pubkey,
        admin_two: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);
        require!(fee_bps <= 10_000, EscrowError::InvalidFeeBps);

        let escrow = &mut ctx.accounts.escrow_state;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.worker = ctx.accounts.worker.key();
        escrow.contract_id = contract_id;

        escrow.admin1 = admin_one;
        escrow.admin2 = admin_two;

        escrow.vault = ctx.accounts.vault.key();
        escrow.usdc_mint = ctx.accounts.usdc_mint.key();

        escrow.amount = amount;
        escrow.fee_bps = fee_bps;
        let fee_wallet = Pubkey::from_str(FEE_WALLET).map_err(|_| error!(EscrowError::InvalidFeeWallet))?;
        escrow.fee_wallet = fee_wallet;

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

        // Transfert USDC: employer ATA -> vault
        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.initializer_usdc_ata.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.initializer.to_account_info(),
            },
        );
        token::transfer(cpi, amount)?;

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

    pub fn release_if_both_approved(ctx: Context<ReleaseIfBothApproved>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;

        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Accepted, EscrowError::BadStatus);
        require!(
            escrow.employer_approved && escrow.worker_approved,
            EscrowError::NotBothApproved
        );

        // Vérifs destination worker ATA
        require!(
            ctx.accounts.worker_usdc_ata.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.worker_usdc_ata.owner == escrow.worker,
            EscrowError::BadOwner
        );

        // Vérifs fee ATA (doit appartenir au fee wallet fixe)
        require!(
            ctx.accounts.admin_fee_account.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.admin_fee_account.owner == escrow.fee_wallet,
            EscrowError::BadOwner
        );

        let fee = (escrow.amount as u128)
            .checked_mul(escrow.fee_bps as u128)
            .ok_or(EscrowError::MathError)?
            / 10_000u128;

        let fee_u64 = fee as u64;
        let to_worker = escrow.amount.checked_sub(fee_u64).ok_or(EscrowError::MathError)?;

        // signer = escrow_state PDA
        let bump_seed = [escrow.bump];
        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow.initializer.as_ref(),
            escrow.worker.as_ref(),
            escrow.contract_id.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: [&[&[u8]]; 1] = [seeds];
        let escrow_state_info = ctx.accounts.escrow_state.to_account_info();

        // vault -> fee
        if fee_u64 > 0 {
            let cpi_fee = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin_fee_account.to_account_info(),
                    authority: escrow_state_info.clone(),
                },
                &signer_seeds,
            );
            token::transfer(cpi_fee, fee_u64)?;
        }

        // vault -> worker
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

    pub fn release_to_worker(ctx: Context<ReleaseToWorker>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Dispute, EscrowError::BadStatus);

        require!(
            escrow.admin1_voted && escrow.admin2_voted,
            EscrowError::NotEnoughVotes
        );
        require!(
            escrow.votes_for_worker > escrow.votes_for_employer,
            EscrowError::VoteNotForWorker
        );

        let admin = ctx.accounts.admin.key();
        require!(admin == escrow.admin1 || admin == escrow.admin2, EscrowError::Unauthorized);

        require!(
            ctx.accounts.worker_usdc_ata.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.worker_usdc_ata.owner == escrow.worker,
            EscrowError::BadOwner
        );

        require!(
            ctx.accounts.admin_fee_account.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.admin_fee_account.owner == escrow.fee_wallet,
            EscrowError::BadOwner
        );

        let fee = (escrow.amount as u128)
            .checked_mul(escrow.fee_bps as u128)
            .ok_or(EscrowError::MathError)?
            / 10_000u128;

        let fee_u64 = fee as u64;
        let to_worker = escrow.amount.checked_sub(fee_u64).ok_or(EscrowError::MathError)?;

        let bump_seed = [escrow.bump];
        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow.initializer.as_ref(),
            escrow.worker.as_ref(),
            escrow.contract_id.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: [&[&[u8]]; 1] = [seeds];
        let escrow_state_info = ctx.accounts.escrow_state.to_account_info();

        if fee_u64 > 0 {
            let cpi_fee = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin_fee_account.to_account_info(),
                    authority: escrow_state_info.clone(),
                },
                &signer_seeds,
            );
            token::transfer(cpi_fee, fee_u64)?;
        }

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

    pub fn refund_to_employer(ctx: Context<RefundToEmployer>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;
        require!(!escrow.finalized, EscrowError::AlreadyFinalized);
        require!(escrow.status == EscrowStatus::Dispute, EscrowError::BadStatus);

        require!(
            escrow.admin1_voted && escrow.admin2_voted,
            EscrowError::NotEnoughVotes
        );
        require!(
            escrow.votes_for_employer > escrow.votes_for_worker,
            EscrowError::VoteNotForEmployer
        );

        let admin = ctx.accounts.admin.key();
        require!(admin == escrow.admin1 || admin == escrow.admin2, EscrowError::Unauthorized);

        require!(
            ctx.accounts.initializer_usdc_ata.mint == escrow.usdc_mint,
            EscrowError::BadMint
        );
        require!(
            ctx.accounts.initializer_usdc_ata.owner == escrow.initializer,
            EscrowError::BadOwner
        );

        let bump_seed = [escrow.bump];
        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow.initializer.as_ref(),
            escrow.worker.as_ref(),
            escrow.contract_id.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: [&[&[u8]]; 1] = [seeds];
        let escrow_state_info = ctx.accounts.escrow_state.to_account_info();

        let cpi_refund = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.initializer_usdc_ata.to_account_info(),
                authority: escrow_state_info,
            },
            &signer_seeds,
        );
        token::transfer(cpi_refund, escrow.amount)?;

        let escrow = &mut ctx.accounts.escrow_state;
        escrow.status = EscrowStatus::Refunded;
        escrow.finalized = true;
        escrow.resolved_for_worker = Some(false);

        Ok(())
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

    #[account(mut)]
    pub admin_fee_account: Account<'info, TokenAccount>,

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

    #[account(mut)]
    pub admin_fee_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundToEmployer<'info> {
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
    pub initializer_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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

    pub amount: u64,
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
    #[msg("Fee wallet invalide")]
    InvalidFeeWallet,
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
}
