// Names and descriptions for EVE's wallet journal entry types, keyed by the
// ESI wallet journal `ref_type`.
//
// GENERATED FILE — do not edit by hand. Regenerate with:
//   node scripts/generate-accounting-entry-types.mjs
//
// Sources: https://sde.hoboleaks.space/tq/accountingentrytypes.json
//          https://raw.githubusercontent.com/ccpgames/eve-glue/master/eve_glue/wallet_journal_ref.py

export interface AccountingEntryType {
  /** `accountEntryTypeID` in the SDE — the numeric id CCP uses internally. */
  id: number;
  /** Name as shown in the EVE client's wallet journal. */
  name: string;
  /** Longer explanation of the transaction, when the SDE provides one. */
  description?: string;
}

export const accountingEntryTypes: Record<string, AccountingEntryType> = {
  acceleration_gate_fee: { id: 53, name: "Acceleration Gate Fee" },
  achievement_category_milestone_reward: {
    id: 199,
    name: "Achievement",
    description: "Reward for reaching an achievement category milestone",
  },
  achievement_milestone_reward: {
    id: 198,
    name: "Achievement",
    description: "Reward for reaching an achievement milestone",
  },
  advertisement_listing_fee: {
    id: 86,
    name: "Advertisement Listing Fee",
    description: "Creating a corporate recruitment advertisement",
  },
  agent_donation: {
    id: 28,
    name: "Agent Donation",
    description: "You donated/bribed the agent",
  },
  agent_location_services: {
    id: 27,
    name: "Agent Location Services",
    description: "You paid agent to locate somebody",
  },
  agent_miscellaneous: {
    id: 25,
    name: "Agent Miscellaneous",
    description: "Agent paid you",
  },
  agent_mission_collateral_paid: {
    id: 30,
    name: "Agent Mission Collateral Paid",
    description: "You gave agent collateral for a mission",
  },
  agent_mission_collateral_refunded: {
    id: 31,
    name: "Agent Mission Collateral Refunded",
    description: "The agent returned collateral to you",
  },
  agent_mission_reward: {
    id: 33,
    name: "Agent Mission Reward",
    description: "The agent gave you this as a reward",
  },
  agent_mission_reward_corporation_tax: {
    id: 93,
    name: "Agent Mission Reward Corporation Tax",
  },
  agent_mission_security_tax: { id: 197, name: "Exordium Mission Agent Tax" },
  agent_mission_time_bonus_reward: {
    id: 34,
    name: "Agent Mission Time Bonus Reward",
    description:
      "The agent gave you this as a special reward for fast mission completion",
  },
  agent_mission_time_bonus_reward_corporation_tax: {
    id: 94,
    name: "Agent Mission Time Bonus Reward Corporation Tax",
  },
  agent_security_services: {
    id: 29,
    name: "Agent Security Services",
    description: "You paid agent to clean your rep",
  },
  agent_services_rendered: {
    id: 43,
    name: "Agent Services Rendered",
    description: "For miscellaneous services rendered by the agent",
  },
  agents_preward: {
    id: 32,
    name: "Agents_preward",
    description: "The agent gave you this when you accepted the mission",
  },
  air_career_program_reward: {
    id: 185,
    name: "AIR Career Program Reward",
    description: "Accounting entry for AIR Career Program goal rewards",
  },
  alliance_maintainance_fee: { id: 50, name: "Alliance Maintainance Fee" },
  alliance_registration_fee: { id: 48, name: "Alliance Registration Fee" },
  allignment_based_gate_toll: { id: 168, name: "Zarzakh Stargate Toll" },
  asset_safety_recovery_tax: {
    id: 123,
    name: "Asset safety recovery tax",
    description: "Tax paid for recovering assets from asset safety",
  },
  bounty: {
    id: 16,
    name: "Bounty",
    description: "Player gave cash to someone's  bounty pool",
  },
  bounty_prize: {
    id: 17,
    name: "Bounty Prize",
    description: "Player got bounty prize for killing someone",
  },
  bounty_prize_corporation_tax: {
    id: 92,
    name: "Bounty Prize Corporation Tax",
  },
  bounty_prizes: { id: 85, name: "Bounty Prizes" },
  bounty_reimbursement: {
    id: 115,
    name: "Bounty Reimbursement",
    description: "Bounty was repaid",
  },
  bounty_surcharge: {
    id: 101,
    name: "Bounty Surcharge",
    description: "Surcharge on bounty because of local conditions.",
  },
  brokers_fee: { id: 46, name: "Brokers Fee" },
  campaign_objective_isk_reward: {
    id: 200,
    name: "Campaign Objective Reward",
    description:
      "The type of the ISK transaction for rewards for contributions to the campaign objectives",
  },
  clone_activation: { id: 8, name: "Clone Activation" },
  clone_transfer: { id: 52, name: "Clone Transfer" },
  contraband_fine: { id: 51, name: "Contraband Fine" },
  contract_auction_bid: {
    id: 63,
    name: "Contract Auction Bid",
    description: "A bid on an Auction",
  },
  contract_auction_bid_corp: { id: 77, name: "Contract Auction Bid (corp)" },
  contract_auction_bid_refund: {
    id: 64,
    name: "Contract Auction Bid Refund",
    description: "Auction Bid refund",
  },
  contract_auction_sold: {
    id: 67,
    name: "Contract Auction Sold",
    description: "Bid payout for an Auction contract",
  },
  contract_brokers_fee: {
    id: 72,
    name: "Contract Brokers Fee",
    description: "Non-refundable contract tax",
  },
  contract_brokers_fee_corp: { id: 80, name: "Contract Brokers Fee (corp)" },
  contract_collateral: {
    id: 65,
    name: "Contract Collateral",
    description: "Collateral for a contract",
  },
  contract_collateral_deposited_corp: {
    id: 78,
    name: "Contract Collateral Deposited (corp)",
  },
  contract_collateral_payout: {
    id: 70,
    name: "Contract Collateral Payout",
    description: "Collateral Payout because of a failed contract",
  },
  contract_collateral_refund: {
    id: 69,
    name: "Contract Collateral Refund",
    description: "Refund of collateral for a Courier contract",
  },
  contract_deposit: {
    id: 74,
    name: "Contract Deposit",
    description: "Contract Deposit, refundable upon successful contract",
  },
  contract_deposit_corp: { id: 81, name: "Contract Deposit (corp)" },
  contract_deposit_refund: { id: 82, name: "Contract Deposit Refund" },
  contract_deposit_sales_tax: {
    id: 75,
    name: "Contract Deposit Sales Tax",
    description: "Contract Deposit Refund",
  },
  contract_price: {
    id: 71,
    name: "Contract Price",
    description: "Contract Price",
  },
  contract_price_payment_corp: {
    id: 79,
    name: "Contract Price Payment (corp)",
  },
  contract_reversal: {
    id: 102,
    name: "Contract Reversal",
    description: "Contract Reversed by GM",
  },
  contract_reward: {
    id: 68,
    name: "Contract Reward",
    description: "Reward for completing a contract",
  },
  contract_reward_deposited: { id: 83, name: "Contract Reward Deposited" },
  contract_reward_deposited_corp: {
    id: 84,
    name: "Contract Reward Deposited (corp)",
  },
  contract_reward_refund: {
    id: 66,
    name: "Contract Reward Refund",
    description: "Reward refund for a cancelled contract",
  },
  contract_sales_tax: {
    id: 73,
    name: "Contract Sales Tax",
    description: "Contract Tax for a successful contract",
  },
  copying: {
    id: 60,
    name: "Copying",
    description: "Installation and runtime cost for a blueprint copying job",
  },
  corporate_reward_payout: {
    id: 99,
    name: "Corporate Reward Payout",
    description: "Corporate reward awarded a player",
  },
  corporate_reward_tax: { id: 103, name: "Corporate Reward Tax" },
  corporation_account_withdrawal: {
    id: 37,
    name: "Corporation Account Withdrawal",
    description: "Withdrawal from corporation account",
  },
  corporation_bulk_payment: {
    id: 47,
    name: "Corporation Bulk Payment",
    description: "A payment from a corporation",
  },
  corporation_dividend_payment: {
    id: 38,
    name: "Corporation Dividend Payment",
  },
  corporation_liquidation: {
    id: 45,
    name: "Corporation Liquidation",
    description: "Funds from the liquidation of a corporation to a shareholder",
  },
  corporation_logo_change_cost: {
    id: 40,
    name: "Corporation Logo Change Cost",
  },
  corporation_payment: {
    id: 11,
    name: "Corporation Payment",
    description: "CEO or Accountant transferred cash  from corp. account",
  },
  corporation_registration_fee: {
    id: 39,
    name: "Corporation Registration Fee",
  },
  cosmetic_market_component_item_purchase: {
    id: 178,
    name: "Paragon Hub Design Element",
    description:
      "Accounting entry for purchases of SKIN Component Items in the Cosmetic Market",
  },
  cosmetic_market_skin_purchase: {
    id: 180,
    name: "Paragon Hub SKIN purchase",
    description:
      "Accounting entry for purchases of SKINs in the Cosmetic Market",
  },
  cosmetic_market_skin_sale: {
    id: 181,
    name: "Paragon Hub SKIN sale",
    description:
      "Accounting entry for the sale of a SKIN on the Cosmetic Market",
  },
  cosmetic_market_skin_sale_broker_fee: {
    id: 179,
    name: "Paragon Hub Listing Fee",
    description:
      "Accounting entry for the broker fee paid when listing SKINs for sale on the Cosmetic Market",
  },
  cosmetic_market_skin_sale_tax: {
    id: 182,
    name: "Paragon Hub Vendor Fee",
    description:
      "Accounting entry for the tax paid on a sale of a SKIN on the Cosmetic Market",
  },
  cosmetic_market_skin_transaction: {
    id: 183,
    name: "Paragon Hub SKIN transaction",
    description:
      "Accounting entry for transactions of SKINs between players in the Cosmetic Market",
  },
  courier_mission_escrow: { id: 23, name: "Courier Mission Escrow" },
  cspa: { id: 35, name: "CSPA", description: "CONCORD Spam Prevention Act" },
  cspaofflinerefund: {
    id: 36,
    name: "CSPAOfflineRefund",
    description: "Refunded CSPA charge because the other party was not online",
  },
  daily_challenge_reward: {
    id: 148,
    name: "Daily Challenge Completed",
    description: "Reward for completing a daily challenge",
  },
  daily_goal_payouts: {
    id: 174,
    name: "Daily Goal Reward",
    description: "Entry type is used for payments made related to daily goals",
  },
  daily_goal_payouts_tax: { id: 175, name: "Daily Goal Reward Tax" },
  datacore_fee: {
    id: 112,
    name: "Datacore Fee",
    description: "Bought datacores from an agent",
  },
  dna_modification_fee: {
    id: 90,
    name: "DNA Modification Fee",
    description: "Fee for attribute modification surgery",
  },
  docking_fee: { id: 12, name: "Docking Fee" },
  duel_wager_escrow: {
    id: 132,
    name: "Duel wager escrow payment",
    description: "Escrow payment for a duel wager",
  },
  duel_wager_payment: {
    id: 133,
    name: "Duel wager reward",
    description: "Reward for winning duel",
  },
  duel_wager_refund: {
    id: 134,
    name: "Duel wager refund",
    description: "Refunded duel wager",
  },
  ess_escrow_transfer: {
    id: 155,
    name: "ESS Escrow Payment",
    description:
      "Payment made to player when autopayment timer expires and main bank has not been robbed",
  },
  external_trade_delivery: {
    id: 138,
    name: "External Trade Delivery",
    description:
      "Money was sold between characters by external trading service.",
  },
  external_trade_freeze: {
    id: 136,
    name: "External Trade Freeze",
    description:
      "Money is frozen by request of external trading service because it has been put on sale.",
  },
  external_trade_thaw: {
    id: 137,
    name: "External Trade Thaw",
    description:
      "Money is no longer frozen by request of external trading service.",
  },
  factory_slot_rental_fee: { id: 14, name: "Factory Slot Rental Fee" },
  flux_payout: {
    id: 144,
    name: "Completed HyperNet Relay Payout",
    description: "A payment for a succesful flux",
  },
  flux_tax: {
    id: 145,
    name: "HyperNet Relay Fee",
    description: "Tax for a succesful flux",
  },
  flux_ticket_repayment: {
    id: 146,
    name: "HyperNode refund for expired HyperNet Offer",
    description: "Ticket repayment for an expired flux",
  },
  flux_ticket_sale: {
    id: 143,
    name: "HyperNode transaction",
    description: "A payment for a flux ticket",
  },
  freelance_jobs_broadcasting_fee: {
    id: 187,
    name: "Freelance Jobs Broadcasting Fee",
    description:
      "Entry type is used for payments made when creating Freelance Jobs - for the broadcasting fee",
  },
  freelance_jobs_duration_fee: {
    id: 186,
    name: "Freelance Jobs Duration Fee",
    description:
      "Entry type is used for payments made when creating Freelance Jobs - for the base fee",
  },
  freelance_jobs_escrow_refund: {
    id: 190,
    name: "Freelance Jobs Escrow Refund",
    description:
      "Entry type is used for refunds made when closing or expiring Freelance Jobs",
  },
  freelance_jobs_reward: {
    id: 189,
    name: "Freelance Jobs Reward",
    description:
      "Entry type is used for payouts made when players contribute to Freelance Jobs",
  },
  freelance_jobs_reward_corporation_tax: {
    id: 191,
    name: "Freelance Jobs Reward Corporation Tax",
    description:
      "Entry type is used for corporation tax on payouts made when players contribute to Freelance Jobs",
  },
  freelance_jobs_reward_escrow: {
    id: 188,
    name: "Freelance Jobs Reward Escrow",
    description:
      "Entry type is used for payments made when creating Freelance Jobs - for the rewards deposit",
  },
  gm_cash_transfer: { id: 3, name: "GM Cash Transfer" },
  gm_plex_fee_refund: {
    id: 192,
    name: "GM Cash Transfer",
    description:
      "Entry type is used for refunds when cancelling PLEX orders due to market policy changes",
  },
  industry_job_tax: {
    id: 120,
    name: "Industry Facility Tax",
    description: "Tax paid to facility owners for manufacturing Jobs",
  },
  industry_security_tax: {
    id: 196,
    name: "Exordium Industrial Tax",
    description: " Industry security tax charged in safe sec",
  },
  infrastructure_hub_maintenance: {
    id: 122,
    name: "Infrastructure Hub bill",
    description:
      "Maintenance fee for running an Infrastructure Hub (plus upgrades)",
  },
  inheritance: { id: 9, name: "Inheritance" },
  insurance: { id: 19, name: "Insurance" },
  insurgency_corruption_contribution_reward: {
    id: 172,
    name: "Insurgency corruption contribution reward",
    description:
      "ISK reward for pirate characters who contribute towards raising corruption during an Insurgency",
  },
  insurgency_suppression_contribution_reward: {
    id: 173,
    name: "Insurgency suppression contribution reward",
    description:
      "ISK reward for antipirate characters who contribute towards raising suppression during an Insurgency",
  },
  item_trader_payment: { id: 142, name: "Item Trade" },
  jump_clone_activation_fee: {
    id: 128,
    name: "Jump Clone Activation Fee",
    description: "Fee for activating a jump clone",
  },
  jump_clone_installation_fee: { id: 55, name: "Jump Clone Installation Fee" },
  kill_right_fee: {
    id: 116,
    name: "Kill Right",
    description: "Kill right bought",
  },
  lp_store: { id: 26, name: "LP Store", description: "Payment to LP Store" },
  manufacturing: {
    id: 56,
    name: "Manufacturing",
    description: "Installation and runtime cost for a manufacturing job",
  },
  market_escrow: { id: 42, name: "Market Escrow" },
  market_fine_paid: { id: 44, name: "Market Fine Paid" },
  market_provider_tax: {
    id: 149,
    name: "SCC surcharge",
    description:
      "Tax paid by the player to the SCC when doing market trade in structures",
  },
  market_security_tax: {
    id: 194,
    name: "Exordium Market Tax",
    description: "Tax charged",
  },
  market_transaction: { id: 2, name: "Market Transaction" },
  medal_creation: {
    id: 87,
    name: "Medal Creation",
    description: "Medal was created",
  },
  medal_issued: {
    id: 88,
    name: "Medal Issued",
    description: "Medal was issued",
  },
  milestone_reward_payment: {
    id: 156,
    name: "First Day ISK Bonus",
    description: "Reward for  First Day ISK Bonus",
  },
  mission_completion: { id: 21, name: "Mission Completion" },
  mission_cost: { id: 24, name: "Mission Cost" },
  mission_expiration: { id: 20, name: "Mission Expiration" },
  mission_reward: { id: 7, name: "Mission Reward" },
  npc_bounty_security_tax: {
    id: 195,
    name: "Exordium Bounty Tax",
    description: "Bounty Security Tax",
  },
  office_rental_fee: { id: 13, name: "Office Rental Fee" },
  operation_bonus: {
    id: 129,
    name: "Mission Reward",
    description: "Mission Reward from the Tutorial",
  },
  opportunity_reward: {
    id: 124,
    name: "Opportunity Reward",
    description: "Reward for opportunity completion",
  },
  planetary_construction: {
    id: 98,
    name: "Planetary Construction",
    description: "Construction on Planet",
  },
  planetary_export_tax: { id: 97, name: "Planetary Export Tax" },
  planetary_import_tax: { id: 96, name: "Planetary Import Tax" },
  player_donation: {
    id: 10,
    name: "Player Donation",
    description: "Player gave cash to another owner",
  },
  player_trading: { id: 1, name: "Player Trading" },
  project_discovery_reward: {
    id: 125,
    name: "Project Discovery reward",
    description:
      "Reward given for scientific contribution to Project Discovery.",
  },
  project_discovery_tax: {
    id: 126,
    name: "Corporation tax on Project Discovery rewards",
    description: "Tax paid for rewards given by Project Discovery",
  },
  project_payouts: {
    id: 170,
    name: "Corporation Projects",
    description:
      "Entry type is used for payments made related to corporation projects",
  },
  reaction: {
    id: 135,
    name: "Reactions",
    description: "Installation and runtime cost for a reaction job",
  },
  redeemed_isk_token: {
    id: 147,
    name: "Redeemed ISK token",
    description: "Reward for redeeming ISK token",
  },
  release_of_impounded_property: {
    id: 41,
    name: "Release Of Impounded Property",
    description:
      "Charge for the receipt of goods from a corporation hangar that is no longer rented",
  },
  repair_bill: { id: 15, name: "Repair Bill" },
  reprocessing_tax: {
    id: 127,
    name: "Reprocessing Tax",
    description: "Tax paid for reprocessing",
  },
  researching_material_productivity: {
    id: 59,
    name: "Researching Material Efficiency",
    description:
      "Installation and runtime cost for a material efficiency research job",
  },
  researching_technology: {
    id: 57,
    name: "Researching Technology",
    description:
      "Installation and runtime cost for a technological research job",
  },
  researching_time_productivity: {
    id: 58,
    name: "Researching Time Efficiency",
    description:
      "Installation and runtime cost for a time efficiency research job",
  },
  resource_wars_reward: {
    id: 131,
    name: "Mining Site Protection Money",
    description: "Payment for protecting valuable ORE from pirates.",
  },
  reverse_engineering: {
    id: 62,
    name: "Reverse Engineering",
    description: "Installation and runtime cost for a reverse engineering job",
  },
  season_challenge_reward: {
    id: 139,
    name: "Challenge Completed",
    description: "A reward for completing a challenge during an event.",
  },
  security_processing_fee: {
    id: 117,
    name: "Fee for processing one or more security tags",
    description: "Tags traded for security status",
  },
  shares: { id: 22, name: "Shares" },
  skill_purchase: {
    id: 141,
    name: "Skill Purchase",
    description: "The player purchased a skill.",
  },
  skyhook_claim_fee: {
    id: 184,
    name: "Skyhook claim fee",
    description:
      "Accounting entry for fee paid when a SovHub claims ownership of a Skyhook",
  },
  sovereignity_bill: {
    id: 91,
    name: "Sovereignty bill",
    description: "CONCORD sovereignty registrar fee",
  },
  store_purchase: {
    id: 106,
    name: "Store Purchase",
    description: "Purchased something from the virtual goods store",
  },
  store_purchase_refund: {
    id: 107,
    name: "Store Purchase Refund",
    description: "We refunded a purchase from the store",
  },
  structure_gate_jump: { id: 140, name: "Jump Bridge Fee" },
  transaction_tax: {
    id: 54,
    name: "Transaction Tax",
    description: "Sales tax paid to the SCC for any transaction",
  },
  under_construction: {
    id: 166,
    name: "Building Materials Delivered",
    description:
      "Payment for delivering building materials for an item under construction",
  },
  upkeep_adjustment_fee: {
    id: 95,
    name: "Upkeep adjustment fee",
    description:
      "Upkeep cost of upgrade for remainder of current billing period",
  },
  war_ally_contract: {
    id: 114,
    name: "War Ally Contract",
    description: "Entity offered its help in a war",
  },
  war_fee: { id: 49, name: "War Fee" },
  war_fee_surrender: {
    id: 113,
    name: "War Surrender Fee",
    description: "One entity surrendered from a war",
  },
};

/**
 * Turns an unknown `ref_type` into something readable ("some_new_fee" ->
 * "Some New Fee"), so entry types CCP adds after this file was generated still
 * render sensibly.
 */
export function humanizeRefType(refType: string): string {
  return refType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The accounting entry type for a journal entry's `ref_type`, if we know it. */
export function getAccountingEntryType(
  refType?: string,
): AccountingEntryType | undefined {
  return refType === undefined ? undefined : accountingEntryTypes[refType];
}

/** Display name for a journal entry's `ref_type`. */
export function getAccountingEntryTypeName(refType?: string): string {
  if (refType === undefined) return "";
  return accountingEntryTypes[refType]?.name ?? humanizeRefType(refType);
}
