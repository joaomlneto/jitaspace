/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * "The transaction type for the given. transaction. Different transaction types will populate different attributes. Note: If you have an existing XML API application that is using ref_types, you will need to know which string ESI ref_type maps to which integer. You can look at the following file to see string->int mappings: https://github.com/ccpgames/eve-glue/blob/master/eve_glue/wallet_journal_ref.py"
 */
export type GetCorporationsCorporationIdWalletsDivisionJournal200ItemRefType = typeof GetCorporationsCorporationIdWalletsDivisionJournal200ItemRefType[keyof typeof GetCorporationsCorporationIdWalletsDivisionJournal200ItemRefType];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const GetCorporationsCorporationIdWalletsDivisionJournal200ItemRefType = {
  acceleration_gate_fee: 'acceleration_gate_fee',
  advertisement_listing_fee: 'advertisement_listing_fee',
  agent_donation: 'agent_donation',
  agent_location_services: 'agent_location_services',
  agent_miscellaneous: 'agent_miscellaneous',
  agent_mission_collateral_paid: 'agent_mission_collateral_paid',
  agent_mission_collateral_refunded: 'agent_mission_collateral_refunded',
  agent_mission_reward: 'agent_mission_reward',
  agent_mission_reward_corporation_tax: 'agent_mission_reward_corporation_tax',
  agent_mission_time_bonus_reward: 'agent_mission_time_bonus_reward',
  agent_mission_time_bonus_reward_corporation_tax: 'agent_mission_time_bonus_reward_corporation_tax',
  agent_security_services: 'agent_security_services',
  agent_services_rendered: 'agent_services_rendered',
  agents_preward: 'agents_preward',
  alliance_maintainance_fee: 'alliance_maintainance_fee',
  alliance_registration_fee: 'alliance_registration_fee',
  asset_safety_recovery_tax: 'asset_safety_recovery_tax',
  bounty: 'bounty',
  bounty_prize: 'bounty_prize',
  bounty_prize_corporation_tax: 'bounty_prize_corporation_tax',
  bounty_prizes: 'bounty_prizes',
  bounty_reimbursement: 'bounty_reimbursement',
  bounty_surcharge: 'bounty_surcharge',
  brokers_fee: 'brokers_fee',
  clone_activation: 'clone_activation',
  clone_transfer: 'clone_transfer',
  contraband_fine: 'contraband_fine',
  contract_auction_bid: 'contract_auction_bid',
  contract_auction_bid_corp: 'contract_auction_bid_corp',
  contract_auction_bid_refund: 'contract_auction_bid_refund',
  contract_auction_sold: 'contract_auction_sold',
  contract_brokers_fee: 'contract_brokers_fee',
  contract_brokers_fee_corp: 'contract_brokers_fee_corp',
  contract_collateral: 'contract_collateral',
  contract_collateral_deposited_corp: 'contract_collateral_deposited_corp',
  contract_collateral_payout: 'contract_collateral_payout',
  contract_collateral_refund: 'contract_collateral_refund',
  contract_deposit: 'contract_deposit',
  contract_deposit_corp: 'contract_deposit_corp',
  contract_deposit_refund: 'contract_deposit_refund',
  contract_deposit_sales_tax: 'contract_deposit_sales_tax',
  contract_price: 'contract_price',
  contract_price_payment_corp: 'contract_price_payment_corp',
  contract_reversal: 'contract_reversal',
  contract_reward: 'contract_reward',
  contract_reward_deposited: 'contract_reward_deposited',
  contract_reward_deposited_corp: 'contract_reward_deposited_corp',
  contract_reward_refund: 'contract_reward_refund',
  contract_sales_tax: 'contract_sales_tax',
  copying: 'copying',
  corporate_reward_payout: 'corporate_reward_payout',
  corporate_reward_tax: 'corporate_reward_tax',
  corporation_account_withdrawal: 'corporation_account_withdrawal',
  corporation_bulk_payment: 'corporation_bulk_payment',
  corporation_dividend_payment: 'corporation_dividend_payment',
  corporation_liquidation: 'corporation_liquidation',
  corporation_logo_change_cost: 'corporation_logo_change_cost',
  corporation_payment: 'corporation_payment',
  corporation_registration_fee: 'corporation_registration_fee',
  courier_mission_escrow: 'courier_mission_escrow',
  cspa: 'cspa',
  cspaofflinerefund: 'cspaofflinerefund',
  daily_challenge_reward: 'daily_challenge_reward',
  datacore_fee: 'datacore_fee',
  dna_modification_fee: 'dna_modification_fee',
  docking_fee: 'docking_fee',
  duel_wager_escrow: 'duel_wager_escrow',
  duel_wager_payment: 'duel_wager_payment',
  duel_wager_refund: 'duel_wager_refund',
  ess_escrow_transfer: 'ess_escrow_transfer',
  external_trade_delivery: 'external_trade_delivery',
  external_trade_freeze: 'external_trade_freeze',
  external_trade_thaw: 'external_trade_thaw',
  factory_slot_rental_fee: 'factory_slot_rental_fee',
  flux_payout: 'flux_payout',
  flux_tax: 'flux_tax',
  flux_ticket_repayment: 'flux_ticket_repayment',
  flux_ticket_sale: 'flux_ticket_sale',
  gm_cash_transfer: 'gm_cash_transfer',
  industry_job_tax: 'industry_job_tax',
  infrastructure_hub_maintenance: 'infrastructure_hub_maintenance',
  inheritance: 'inheritance',
  insurance: 'insurance',
  item_trader_payment: 'item_trader_payment',
  jump_clone_activation_fee: 'jump_clone_activation_fee',
  jump_clone_installation_fee: 'jump_clone_installation_fee',
  kill_right_fee: 'kill_right_fee',
  lp_store: 'lp_store',
  manufacturing: 'manufacturing',
  market_escrow: 'market_escrow',
  market_fine_paid: 'market_fine_paid',
  market_provider_tax: 'market_provider_tax',
  market_transaction: 'market_transaction',
  medal_creation: 'medal_creation',
  medal_issued: 'medal_issued',
  milestone_reward_payment: 'milestone_reward_payment',
  mission_completion: 'mission_completion',
  mission_cost: 'mission_cost',
  mission_expiration: 'mission_expiration',
  mission_reward: 'mission_reward',
  office_rental_fee: 'office_rental_fee',
  operation_bonus: 'operation_bonus',
  opportunity_reward: 'opportunity_reward',
  planetary_construction: 'planetary_construction',
  planetary_export_tax: 'planetary_export_tax',
  planetary_import_tax: 'planetary_import_tax',
  player_donation: 'player_donation',
  player_trading: 'player_trading',
  project_discovery_reward: 'project_discovery_reward',
  project_discovery_tax: 'project_discovery_tax',
  reaction: 'reaction',
  redeemed_isk_token: 'redeemed_isk_token',
  release_of_impounded_property: 'release_of_impounded_property',
  repair_bill: 'repair_bill',
  reprocessing_tax: 'reprocessing_tax',
  researching_material_productivity: 'researching_material_productivity',
  researching_technology: 'researching_technology',
  researching_time_productivity: 'researching_time_productivity',
  resource_wars_reward: 'resource_wars_reward',
  reverse_engineering: 'reverse_engineering',
  season_challenge_reward: 'season_challenge_reward',
  security_processing_fee: 'security_processing_fee',
  shares: 'shares',
  skill_purchase: 'skill_purchase',
  sovereignity_bill: 'sovereignity_bill',
  store_purchase: 'store_purchase',
  store_purchase_refund: 'store_purchase_refund',
  structure_gate_jump: 'structure_gate_jump',
  transaction_tax: 'transaction_tax',
  upkeep_adjustment_fee: 'upkeep_adjustment_fee',
  war_ally_contract: 'war_ally_contract',
  war_fee: 'war_fee',
  war_fee_surrender: 'war_fee_surrender',
} as const;