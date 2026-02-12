use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_pack::Pack;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::token::spl_token::state::Account as SplTokenAccount;

declare_id!("7ztZfuYcFzPF4tgy1iFkHhTNSowKFPGdUx3QNoGg12Re");

pub const DISPUTE_FEE_BPS: u16 = 1500;

#[program]
pub mod escrow_program {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        contract_id: u64,
        amount: u64,
        fee_bps: u16,
        admin_one: Pubkey,
        admin_two: Pubkey,
    ) -> Result<()> {
        msg!("INIT START");

        require!(amount > 0, EscrowError::InvalidAmount);
        require!(fee_bps <= 10_000, EscrowError::InvalidFeeBps);

        // Check owners (no data borrow here)
        require_keys_eq!(
            *ctx.accounts.initializer_usdc_ata.owner,
            ctx.accounts.token_program.key(),
            EscrowError::InvalidInitializerAta
        );

        require_keys_eq!(
            *ctx.accounts.admin_fee_account.owner,
            ctx.accounts.token_program.key(),
            EscrowError::InvalidAdminFeeAccount
        );

        // ---- Borrow/unpack in a scope so borrows are dropped BEFORE CPI ----
        {
            let init_ata_data = ctx.accounts.initializer_usdc_ata.try_borrow_data()?;
            let init_ata = SplTokenAccount::unpack(&init_ata_data)
                .map_err(|_| error!(EscrowError::InvalidInitializerAta))?;

            require_keys_eq!(
                init_ata.owner,
                ctx.accounts.initializer.key(),
                EscrowError::InvalidInitializerAta
            );

            require_keys_eq!(
                init_ata.mint,
                ctx.accounts.usdc_mint.key(),
                EscrowError::InvalidInitializerAta
            );
        }

        {
            let fee_acc_data = ctx.accounts.admin_fee_account.try_borrow_data()?;
            let fee_acc = SplTokenAccount::unpack(&fee_acc_data)
                .map_err(|_| error!(EscrowError::InvalidAdminFeeAccount))?;

            require_keys_eq!(
                fee_acc.mint,
                ctx.accounts.usdc_mint.key(),
                EscrowError::InvalidAdminFeeAccount
            );
        }
        // ---- borrows released here ----

        // Amount split
        let fee_amount = (amount as u128)
            .checked_mul(fee_bps as u128)
            .ok_or(EscrowError::MathError)?
            / 10_000;

        let fee_amount = fee_amount as u64;

        let to_vault = amount
            .checked_sub(fee_amount)
            .ok_or(EscrowError::MathError)?;

        // Write state
        let escrow = &mut ctx.accounts.escrow_state;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.worker = ctx.accounts.worker.key();
        escrow.contract_id = contract_id;

        escrow.admin1 = admin_one;
        escrow.admin2 = admin_two;

        escrow.vault = ctx.accounts.vault.key();
        escrow.usdc_mint = ctx.accounts.usdc_mint.key();

        escrow.amount = to_vault;
        escrow.fee_bps = fee_bps;

        escrow.status = EscrowStatus::Initialized;

        escrow.employer_approved = false;
        escrow.worker_approved = false;

        escrow.admin1_voted = false;
        escrow.admin2_voted = false;
        escrow.votes_for_worker = 0;
        escrow.votes_for_employer = 0;

        escrow.finalized = false;
        escrow.resolved_for_worker = None;

        escrow.bump = ctx.bumps.escrow_state;

        // Transfers (now safe, no borrows held)
        if fee_amount > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.initializer_usdc_ata.to_account_info(),
                        to: ctx.accounts.admin_fee_account.to_account_info(),
                        authority: ctx.accounts.initializer.to_account_info(),
                    },
                ),
                fee_amount,
            )?;
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.initializer_usdc_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.initializer.to_account_info(),
                },
            ),
            to_vault,
        )?;

        msg!("INIT END");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(contract_id: u64)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// CHECK: worker ne signe pas
    pub worker: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        space = 8 + EscrowState::SPACE,
        seeds = [
            b"escrow",
            initializer.key().as_ref(),
            worker.key().as_ref(),
            &contract_id.to_le_bytes()
        ],
        bump
    )]
    pub escrow_state: Box<Account<'info, EscrowState>>,

    #[account(
        init,
        payer = initializer,
        seeds = [
            b"vault",
            initializer.key().as_ref(),
            worker.key().as_ref(),
            &contract_id.to_le_bytes()
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_state
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: vérifié manuellement
    #[account(mut)]
    pub initializer_usdc_ata: UncheckedAccount<'info>,

    /// CHECK: vérifié manuellement
    #[account(mut)]
    pub admin_fee_account: UncheckedAccount<'info>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct EscrowState {
    pub initializer: Pubkey,
    pub worker: Pubkey,
    pub contract_id: u64,

    pub admin1: Pubkey,
    pub admin2: Pubkey,

    pub vault: Pubkey,
    pub usdc_mint: Pubkey,

    pub amount: u64,
    pub fee_bps: u16,

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
}

impl EscrowState {
    pub const SPACE: usize = 320;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum EscrowStatus {
    Initialized = 0,
    Accepted = 1,
    Dispute = 2,
    Released = 3,
    Refunded = 4,
}

#[error_code]
pub enum EscrowError {
    #[msg("Montant invalide")]
    InvalidAmount,
    #[msg("Fee invalide")]
    InvalidFeeBps,
    #[msg("Erreur math")]
    MathError,

    #[msg("Initializer ATA invalide")]
    InvalidInitializerAta,

    #[msg("Admin fee account invalide")]
    InvalidAdminFeeAccount,
}
