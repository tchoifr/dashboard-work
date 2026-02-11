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
      "name": "adminVote",
      "discriminator": [
        141,
        5,
        163,
        49,
        144,
        145,
        114,
        36
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "voteForWorker",
          "type": "bool"
        }
      ]
    },
    {
      "name": "employerApproveCompletion",
      "discriminator": [
        103,
        122,
        168,
        117,
        133,
        158,
        218,
        115
      ],
      "accounts": [
        {
          "name": "initializer",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
              }
            ]
          }
        }
      ],
      "args": []
    },
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
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "initializerUsdcAta",
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
          "type": {
            "array": [
              "u8",
              32
            ]
          }
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
    },
    {
      "name": "openDispute",
      "discriminator": [
        137,
        25,
        99,
        119,
        23,
        223,
        161,
        42
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "refundToEmployer",
      "discriminator": [
        136,
        203,
        247,
        3,
        218,
        58,
        228,
        28
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
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
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "initializerUsdcAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "releaseIfBothApproved",
      "discriminator": [
        194,
        43,
        239,
        174,
        217,
        74,
        108,
        57
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
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
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "workerUsdcAta",
          "writable": true
        },
        {
          "name": "adminFeeAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "releaseToWorker",
      "discriminator": [
        54,
        127,
        2,
        20,
        203,
        213,
        225,
        45
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
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
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "workerUsdcAta",
          "writable": true
        },
        {
          "name": "adminFeeAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "workerAccept",
      "discriminator": [
        156,
        192,
        23,
        88,
        168,
        66,
        85,
        173
      ],
      "accounts": [
        {
          "name": "worker",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "workerApproveCompletion",
      "discriminator": [
        51,
        38,
        42,
        75,
        162,
        207,
        100,
        148
      ],
      "accounts": [
        {
          "name": "worker",
          "signer": true
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
                "path": "escrow_state.initializer",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.worker",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.contract_id",
                "account": "escrowState"
              }
            ]
          }
        }
      ],
      "args": []
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
      "msg": "FeeBps invalide"
    },
    {
      "code": 6002,
      "name": "invalidFeeWallet",
      "msg": "Fee wallet invalide"
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "Non autorisé"
    },
    {
      "code": 6004,
      "name": "badStatus",
      "msg": "Mauvais status pour cette action"
    },
    {
      "code": 6005,
      "name": "alreadyFinalized",
      "msg": "Déjà finalisé"
    },
    {
      "code": 6006,
      "name": "notBothApproved",
      "msg": "Pas validé par les deux"
    },
    {
      "code": 6007,
      "name": "alreadyVoted",
      "msg": "Déjà voté"
    },
    {
      "code": 6008,
      "name": "notEnoughVotes",
      "msg": "Votes insuffisants"
    },
    {
      "code": 6009,
      "name": "voteNotForWorker",
      "msg": "Le vote ne favorise pas le worker"
    },
    {
      "code": 6010,
      "name": "voteNotForEmployer",
      "msg": "Le vote ne favorise pas l'employer"
    },
    {
      "code": 6011,
      "name": "badMint",
      "msg": "Mint invalide"
    },
    {
      "code": 6012,
      "name": "badOwner",
      "msg": "Owner invalide"
    },
    {
      "code": 6013,
      "name": "mathError",
      "msg": "Erreur de calcul"
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
            "type": {
              "array": [
                "u8",
                32
              ]
            }
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
            "name": "feeWallet",
            "type": "pubkey"
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
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
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
