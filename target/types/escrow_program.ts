/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow_program.json`.
 */
export type EscrowProgram = {
  "address": "7ztZfuYcFzPF4tgy1iFkHhTNSowKFPGdUx3QNoGg12Re",
  "metadata": {
    "name": "escrowProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Byhnex escrow USDC"
  },
  "instructions": [
    {
      "name": "initializeEscrow",
      "discriminator": [
        243,
        160,
        77,
        153,
        11,
        92,
        48,
        209
      ],
      "accounts": [
        {
          "name": "initializer",
          "writable": true,
          "signer": true
        },
        {
          "name": "worker"
        },
        {
          "name": "escrowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "initializer"
              },
              {
                "kind": "account",
                "path": "worker"
              },
              {
                "kind": "arg",
                "path": "contractId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "initializer"
              },
              {
                "kind": "account",
                "path": "worker"
              },
              {
                "kind": "arg",
                "path": "contractId"
              }
            ]
          }
        },
        {
          "name": "initializerUsdcAta",
          "writable": true
        },
        {
          "name": "adminFeeAccount",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contractId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "adminOne",
          "type": "pubkey"
        },
        {
          "name": "adminTwo",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "escrowState",
      "discriminator": [
        19,
        90,
        148,
        111,
        55,
        130,
        229,
        108
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Montant invalide"
    },
    {
      "code": 6001,
      "name": "invalidFeeBps",
      "msg": "Fee invalide"
    },
    {
      "code": 6002,
      "name": "mathError",
      "msg": "Erreur math"
    },
    {
      "code": 6003,
      "name": "invalidInitializerAta",
      "msg": "Initializer ATA invalide"
    },
    {
      "code": 6004,
      "name": "invalidAdminFeeAccount",
      "msg": "Admin fee account invalide"
    }
  ],
  "types": [
    {
      "name": "escrowState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initializer",
            "type": "pubkey"
          },
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "contractId",
            "type": "u64"
          },
          {
            "name": "admin1",
            "type": "pubkey"
          },
          {
            "name": "admin2",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          },
          {
            "name": "employerApproved",
            "type": "bool"
          },
          {
            "name": "workerApproved",
            "type": "bool"
          },
          {
            "name": "admin1Voted",
            "type": "bool"
          },
          {
            "name": "admin2Voted",
            "type": "bool"
          },
          {
            "name": "votesForWorker",
            "type": "u8"
          },
          {
            "name": "votesForEmployer",
            "type": "u8"
          },
          {
            "name": "finalized",
            "type": "bool"
          },
          {
            "name": "resolvedForWorker",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "initialized"
          },
          {
            "name": "accepted"
          },
          {
            "name": "dispute"
          },
          {
            "name": "released"
          },
          {
            "name": "refunded"
          }
        ]
      }
    }
  ]
};
