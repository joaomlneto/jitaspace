/**
 * The Council of Stellar Management election featured on `/csm`.
 *
 * Hand-curated from Fenris Creations' announcement and the EVE Online forums:
 * there is no API for CSM candidates. Each `characterId` was resolved from the
 * candidate's name through ESI and checked against the corporation and
 * alliance the announcement lists, so a renamed or recycled name cannot point
 * the page at the wrong pilot.
 */

export interface CsmCandidate {
  characterId: number;
  /** The character's name as the announcement prints it. */
  name: string;
  /** The candidate's "Short Pitch", verbatim from the official announcement. */
  pitch: string;
  /** The candidate's campaign thread in the EVE Online forums' CSM Campaigns category. */
  forumThread: string;
}

export interface CsmInterview {
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD) the interviews were streamed. */
  date: string;
  /** Length of the recording, in minutes. */
  minutes: number;
}

export interface CsmElection {
  /** Council number, e.g. 21 for CSM 21. */
  number: number;
  /** Short label, e.g. "CSM 21". */
  name: string;
  /** Campaign period, ISO dates (inclusive). */
  campaign: { start: string; end: string };
  /** Voting window, ISO datetimes (downtime, 11:00 UTC, to downtime). */
  voting: { start: string; end: string };
  /** The official candidate announcement. */
  announcement: string;
  /** Where to cast a ballot, once Fenris Creations publishes it. */
  voteUrl?: string;
  /** The EVE Online forums' CSM campaign threads. */
  forumCategory: string;
  interviews: CsmInterview[];
  candidates: CsmCandidate[];
}

/** Candidates in the announcement's order (alphabetical, case-insensitive). */
const CSM_21_CANDIDATES: CsmCandidate[] = [
  {
    characterId: 1507333016,
    name: "0BAKEE",
    pitch:
      "I’ve been playing EVE since about 2009, mostly in lowsec, small-gang and solo PvP, piracy, and Faction Warfare. I want to bring a bit of an outsider perspective to the table. My priorities are risk and reward, unstructured PvP, and new-player retention. Players need reasons to undock.",
    forumThread:
      "https://forums.eveonline.com/t/0bakee-for-csm-21-protect-the-sandbox-create-reasons-to-undock-represent-the-players/519525",
  },
  {
    characterId: 1287579084,
    name: "Adhamhnon",
    pitch:
      "I've been an EVE Online player since 2004. I've been a mission runner, explorer in all space types, reluctant miner, builder, PvPer, and part of two major alliances. My goals are about building the game up for everyone, from high sec to null, not to tear it down.",
    forumThread:
      "https://forums.eveonline.com/t/adhamhnon-for-csm-21-its-about-the-little-things/519367",
  },
  {
    characterId: 2121451526,
    name: "Amiomia",
    pitch:
      "I bring fresh eyes to the CSM without being tied to one bloc, playstyle or agenda. I don’t claim to have every answer. I want to listen, find the people who understand each issue best, ask the right questions and make sure different parts of EVE are heard when it matters.",
    forumThread:
      "https://forums.eveonline.com/t/amiomia-for-csm-21-eve-is-its-people/519575",
  },
  {
    characterId: 2115401170,
    name: "Angela Chent-Shi",
    pitch:
      "I'm Angela, a wormhole FC, Alliance Tournament Captain, and PvP enthusiast. I'm running to bring a unique perspective to your CSM, both as a wormholer and as a woman in the EVE Online community. I want the game itself to encourage players to discover what different areas of space offer.",
    forumThread:
      "https://forums.eveonline.com/t/angela-chent-shi-for-csm-21-a-next-gen-wormhole-rep/518677",
  },
  {
    characterId: 2118845004,
    name: "Ankh Lai",
    pitch:
      "I came to EVE for the stories, nearly bounced off it, and stayed because other players showed me what the game could be. I’ve gone from leading new players in a null bloc to joining a small alliance. I’m still running for the same reason: helping more people stick around.",
    forumThread:
      "https://forums.eveonline.com/t/ankh-lai-for-csm21-new-players-need-a-path-into-eve/518714",
  },
  {
    characterId: 92571320,
    name: "Arhont Sibirskii",
    pitch:
      "I'm CEO of the \"Can I bring my Drake...\" alliance, a mid-scale and large-scale fleet commander, and an organiser of public events. I've played for over 13 years and been a streamer and game promoter for seven years. I'm active in nullsec and lowsec.",
    forumThread:
      "https://forums.eveonline.com/t/arhont-sibirskii-csm-21/519455",
  },
  {
    characterId: 94501696,
    name: "Arrowspeeed Bounty",
    pitch:
      "I remain an advocate for EVE as a true sandbox accommodating many ways to play and the great adventure of sorting through it all. I want to help give you those days where you see what seems an unsolvable puzzle and rejoice mightily when you conquer it.",
    forumThread:
      "https://forums.eveonline.com/t/arrowspeeed-bounty-for-csm-21-for-all-who-love-the-game/518749",
  },
  {
    characterId: 224846390,
    name: "Bluedagger",
    pitch:
      "My name is Bluedagger. I’m the CEO of a low-class wormhole corporation called New Jovian Exploration Department. I’m running for CSM to focus on more meaningful conflict drivers for PvP and breaking up the sameness of PvE content in wormhole space.",
    forumThread:
      "https://forums.eveonline.com/t/bluedagger-for-csm-21-reinvigorating-wormholes-from-the-bottom-up/519011",
  },
  {
    characterId: 585213969,
    name: "Ceema",
    pitch:
      "I'm running for CSM. And no, it's not a bit. I want to represent all of New Eden. Not just Nullsec. Not just the builders, the PvPers, Lowsec, Highsec, or the Wormholers. I'm running to make sure every capsuleer has a seat at this table.",
    forumThread:
      "https://forums.eveonline.com/t/ceema-for-csm21-lets-build-bridges-not-bitterness/519027",
  },
  {
    characterId: 91695418,
    name: "CruelCodex Owasso",
    pitch:
      "I’m running for CSM to represent the players who love EVE’s depth but see where its systems, UI, and everyday gameplay can be better. I bring years of EVE experience, a systems-focused mindset, and a commitment to turning player feedback into practical improvements.",
    forumThread:
      "https://forums.eveonline.com/t/o7-i-m-cruelcodex-owasso-and-i-m-running-for-csm-21/519541",
  },
  {
    characterId: 1431369930,
    name: "Culaure",
    pitch:
      "As Culaure, I lead Frog Assault Command, the largest Gallente Faction Warfare alliance. I’m active in the warzone daily, organizing campaigns, logistics, new-player training, and frontline operations. I’m running for CSM 21 to give Factional Warfare a practical, experienced, and constructive voice.",
    forumThread:
      "https://forums.eveonline.com/t/culaure-for-csm-21-a-strong-voice-for-faction-warfare-and-low-sec/518946",
  },
  {
    characterId: 2122181331,
    name: "DCTDN",
    pitch:
      "I am one of the CACX instructors at FRT, active in the UTC+8 time zone and quick to respond to players’ needs. Through frequent contact with new players, I understand what they need and want to bring their problems and feedback to the CSM.",
    forumThread:
      "https://forums.eveonline.com/t/dctdn-an-ordinary-player-and-csm/519548",
  },
  {
    characterId: 1256427632,
    name: "Drake Iddon",
    pitch:
      "I’m a CSM veteran and ongoing Pochven updater with a strong grasp of economics and data analytics. With the Ansiblex changes in full swing, there is a perfect opportunity to introduce new income avenues for new and old players alike, all without wrecking the economy.",
    forumThread:
      "https://forums.eveonline.com/t/drake-iddon-for-csm21-consistent-reliable-proven-representation-for-all/519536",
  },
  {
    characterId: 94271952,
    name: "Dujek Oneye",
    pitch:
      "I am active in all areas of space, an avid PVPer and active in the EVE community. On CSM19 I started several long-term projects I would like to continue. If elected, I promise to answer all messages and commit the time and effort needed so that player voices are heard.",
    forumThread:
      "https://forums.eveonline.com/t/dujek-oneye-for-csm21-a-candidate-for-everyone/519313",
  },
  {
    characterId: 337065609,
    name: "DutchGunner",
    pitch:
      "I want to be your representative for better and more balanced events and campaigns, with more lore integration in events, expansions and player actions. I will also work hard to ensure changes or fixes for one part of the game don’t cause issues elsewhere.",
    forumThread:
      "https://forums.eveonline.com/t/dutchgunner-for-csm-21-lore-highsec-events-the-hud/519553",
  },
  {
    characterId: 170381092,
    name: "Frozen Fallout",
    pitch:
      "As host of the Federation Front Line Report podcast, I tell the stories of Faction Warfare and lowsec. On CSM 21, I will fight for a better LP store, stronger community-building tools, and more rewarding reasons to undock in lowsec.",
    forumThread:
      "https://forums.eveonline.com/t/frozen-fallout-for-csm-21/518945",
  },
  {
    characterId: 208625077,
    name: "HuntBuzz",
    pitch:
      "An EVE pilot since 2006, I've mined, explored, fought and led fleets. I'm running for CSM to champion transparency, balance and stability, bringing two decades of experience to help shape a stronger future for EVE and the players who make it thrive.",
    forumThread:
      "https://forums.eveonline.com/t/huntbuzz-for-csm-21-a-resilient-and-healthy-game-for-all/518672",
  },
  {
    characterId: 513341814,
    name: "hyprviper1",
    pitch:
      "My expertise revolves around null sec, diplomacy, spying, building space-castles, and understanding how small alliances work and their struggles to build up an alliance. I hope to continue the momentum from CSM 20 and carry it into CSM 21 to improve the game.",
    forumThread:
      "https://forums.eveonline.com/t/hyprviper1-for-csm-xxi-return-to-the-sausage-factory-small-alliances-need-space-to-grow-and-thrive/519402",
  },
  {
    characterId: 92993073,
    name: "Itaer",
    pitch:
      "I am a current member of CSM 20, representing the small-gang, tournament, and wormhole communities. I have spent my term focusing on meaningful game improvements in quality of life, ship balance, and conflict driving features. For example, the clone bay in Jita was the result of my advocacy.",
    forumThread: "https://forums.eveonline.com/t/itaer-for-csm-21/519308",
  },
  {
    characterId: 2119310422,
    name: "itsFluffy000",
    pitch:
      "I hunt the chain on d-scan, throw down in WH brawls, and run lowsec blops and cap fights. Lowsec and J-space are a third of everything that dies in EVE on a sliver of the dev attention. Not here to promise miracles, just a vote that actually undocks out here.",
    forumThread:
      "https://forums.eveonline.com/t/itsfluffy000-for-csm-21-more-people-in-space-more-reasons-to-fight/519599",
  },
  {
    characterId: 2114291455,
    name: "Jay Cee Ormand",
    pitch:
      "High-Sec CEO supporting newbros, inexperienced pilots, and independence from Nullsec blocs. My goals are accessible mechanics, better High-Sec resource yields, fleet defense against ganking, and QoL fixes for PI and industry. A pragmatic voice for quality, rewarding play for low-playtime pilots.",
    forumThread:
      "https://forums.eveonline.com/t/new-meat-for-new-eden-jay-cee-ormand/519540",
  },
  {
    characterId: 95511674,
    name: "Jennifer Corring",
    pitch:
      "Amarr is my home, but Faction Warfare and lowsec are my community. As the organizer of Militia Monday, I work directly with new and veteran pilots alike. I'm running for CSM to ensure their experiences, concerns, and ideas have a strong voice at the table.",
    forumThread:
      "https://forums.eveonline.com/t/jennifer-corring-jc-for-csm-21-representation-for-fw-lowsec/518951",
  },
  {
    characterId: 96104294,
    name: "Joilove Sunrunner",
    pitch:
      "I'm running to bring more JOY and LOVE to our EVE experience. My focus is growing the player base, improving the play/life balance, and making real friendships and lasting connections easier. Let's expand to the next generation, bring back old players and build lasting relationships that span the globe.",
    forumThread:
      "https://forums.eveonline.com/t/lets-throw-an-eve-fan-party-in-the-birthplace-of-techno-music-and-mix-things-up-with-a-player-bounty-hunter-system-toss-one-of-your-votes-in-favor-of-joilove-joy-love-joining-csm-21-balance-growth-value/518678",
  },
  {
    characterId: 1083970375,
    name: "Kenneth Feld",
    pitch:
      "Long-time player, just looking to make industry better. No more wish lists. I am just going to work on the fringe and get QoL stuff done that has been ignored way too long: industry UI, the 25,000 blueprint limit, the 2,000 job limit for ESI, and ACL folders.",
    forumThread: "https://forums.eveonline.com/t/kenneth-feld-csm-21/519531",
  },
  {
    characterId: 2116233396,
    name: "Kshal Aideron",
    pitch:
      "My expertise is in working with new players, developing communities and high sec. During CSM20, I was able to give input into Exordium and Faction Warfare from a new player perspective. I'm here to make sure new players are kept in mind and continue trying to effect change.",
    forumThread:
      "https://forums.eveonline.com/t/kshal-aideron-for-csm-21-new-players-highsec-community/519221",
  },
  {
    characterId: 2112821535,
    name: "Limited Liability",
    pitch:
      "I am a bit of an unorthodox candidate, BUT I think I have something different to offer the Council over the standard big bloc representatives. I want to advocate for reaching potential new players through videos that give them a realistic idea of what this game is REALLY about.",
    forumThread:
      "https://forums.eveonline.com/t/limited-liability-for-csm21/519537",
  },
  {
    characterId: 990913444,
    name: "Mercilessguard",
    pitch:
      "I would like to help shape the future of EVE Online, bringing my experiences as a player. My early experiences of being stalked and destroyed as a new player have always stuck with me. I want an EVE community that stays and continues to grow.",
    forumThread:
      "https://forums.eveonline.com/t/mercilessguard-csm-21-your-average-becomes-your-longevity/519479",
  },
  {
    characterId: 1946611318,
    name: "Mike Azariah",
    pitch:
      "Mike Azariah seeks CSM 21, drawing on six prior CSM terms and years of EVE experience. He emphasizes communication, player representation, institutional memory, and helping new players through Operation Magic School Bus. He promises to listen, communicate, and keep working for EVE’s future.",
    forumThread: "https://forums.eveonline.com/t/mike-azariah-csm-21/518845",
  },
  {
    characterId: 2117322256,
    name: "MILINT ARC Trooper",
    pitch:
      "I'm a solo player from Minmatar space, playing since 2020. I enjoy testing and experimenting with content and ships. I want exploration, mining, and hauling to be meaningful experiences for solo and new players and small corps. For targets, of course.",
    forumThread:
      "https://forums.eveonline.com/t/milint-arc-trooper-for-csm-21-general-foundations-and-experimentation-in-eve/519087",
  },
  {
    characterId: 2122676148,
    name: "Misty Dawn253",
    pitch:
      "I’m Misty Dawn253, CEO of Cozy Mischief and skirmish FC for Sedition Alliance. A vote for me is a vote for a more active, objective-based insurgency and a more queer-friendly EVE. I want militia and pirate forces to have a reason to actively fight each other.",
    forumThread:
      "https://forums.eveonline.com/t/misty-dawn253-for-csm-21-low-sec-insurgencies/519162",
  },
  {
    characterId: 2118964457,
    name: "Nordpol The Extinguisher",
    pitch:
      "My passions for things that keep EVE running, like mining, industry or alliance infrastructure, are supported by those that will keep EVE going forever, like sustainable leadership and a sense of belonging for new and old players alike. My CSM term will be shaped by the exchange with other players.",
    forumThread:
      "https://forums.eveonline.com/t/nordpol-the-csm-gotta-start-somewhere/519466",
  },
  {
    characterId: 92702934,
    name: "Nova Terra-Ren",
    pitch:
      "Devout wormholer, former nullsec small-alliance leader, and most importantly, storyteller, Nova is the candidate for an EVE where multiboxers and singleboxers can thrive without restricting one another, where small groups feel significant, and where players new or old feel that their stories matter.",
    forumThread:
      "https://forums.eveonline.com/t/nova-terra-ren-for-csm-21-for-player-stories-that-matter/519542",
  },
  {
    characterId: 2122422109,
    name: "Nyx 0",
    pitch:
      "I am Nyx 0, a lover of spreadsheets and a holder of many opinions of varying quality. My experience is with the market and the surrounding economy, with particular interest in addressing the ever-sharpening rate of increase of isk supply as well as continued improvements to the ESI.",
    forumThread:
      "https://forums.eveonline.com/t/nyx-0-for-csm-21-somewhat-questionable-opinions-on-the-economy/519236",
  },
  {
    characterId: 93672441,
    name: "Orion Sa-Solo",
    pitch:
      "I want to give back to the game and folks that have helped me. I’m dedicating my time to support players and bring their concerns, ideas, and hopes to FC, pushing for more content and new objectives that keep players engaged across all areas of space.",
    forumThread:
      "https://forums.eveonline.com/t/undock-csm-21-orion-sa-solo/518666",
  },
  {
    characterId: 1417371863,
    name: "Pandoralica",
    pitch:
      "Pando (zehPando on Twitch), former CSM and a rare bridge between the largest and smallest scales of PVP. Led countless fleets for INIT and lost just as many ships solo or in a small gang. Big issues require a well-balanced perspective and Ansiblexes were just the tip of the iceberg.",
    forumThread: "https://forums.eveonline.com/t/pando-for-csm-21/518780",
  },
  {
    characterId: 94404038,
    name: "Poiuyt20 Fliba",
    pitch:
      "Hello fellow gamers, I am Poiuyt20, a high class wormholer campaigning on a J space focus. I am working to carry forward the momentum from the previous WH CSMs and continue to increase opportunities to put ships in space while maintaining a fair balance between high/low class, and K space.",
    forumThread:
      "https://forums.eveonline.com/t/poiuyt20-csm21-another-step-forward/518745",
  },
  {
    characterId: 90866585,
    name: "Rathon Altol",
    pitch:
      "I have been an EVE player since 2011, focused on industry, logistics, sovereignty, and player organizations. I want to cut pointless busywork, improve corp tools, and make sure changes are judged by their impact across all of New Eden—not just one playstyle.",
    forumThread:
      "https://forums.eveonline.com/t/rathon-altol-for-csm-21-experience-earned-the-hard-way/518675",
  },
  {
    characterId: 1140209800,
    name: "Reagalan",
    pitch:
      'Veteran Goon, cat herder, and director emeritus. Enjoyer of sandboxes, big boxes, multi-boxes, and checkboxes. Hates arbitrary rules, pointless tedium, echo-chambers, and political chevauchées. Likes blueberries, time dilation, "realism", automation, and the old Moa model.',
    forumThread:
      "https://forums.eveonline.com/t/reagalan-csm-21-a-new-order-for-the-ages/519471",
  },
  {
    characterId: 91309497,
    name: "Sawdeth Ternius",
    pitch:
      "Vanguard-EVE Bridge Specialist, focused on community building and providing tips and tricks to defend your stuff from the ground up. I bring 24 years of FPS gaming experience and want to bridge the connection between the Vanguard and the Capsuleer.",
    forumThread:
      "https://forums.eveonline.com/t/sawdeth-ternius-for-csm-21-vanguard-eve-bridge-specialist-the-voice-of-reason/518611",
  },
  {
    characterId: 2119023115,
    name: "Schadsquatch",
    pitch:
      "Schadsquatch is running for CSM to drive fast-paced, high-stakes action in EVE Online. Focused on delivering bite-sized, accessible PvP, he aims to restore value to wormhole space, boost low/null capital PvE, cut dreadnought costs, and refine FW dynamics for quick, high-risk/high-reward combat.",
    forumThread: "https://forums.eveonline.com/t/schadsquatch-for-csm21/518838",
  },
  {
    characterId: 2118255062,
    name: "Sean Vanstroll",
    pitch:
      "6-year wormhole player seeking to represent J-space in the CSM. I've been in many different corps and alliances in J-space and have a deep sense of what it's like living in wormholes. We stay separated by lack of stargates, but united under Bob.",
    forumThread:
      "https://forums.eveonline.com/t/sean-vanstroll-representing-wormholes-csm-21/519598",
  },
  {
    characterId: 1628670876,
    name: "sennett",
    pitch:
      "I’m Sennett, an 18-year EVE veteran and Co-CEO of [3.14-] and [0MD]. I’m passionate about player retention and quality-of-life improvements for every playstyle. I bring hands-on experience across large- and small-scale PvP, logistics, and industry, from both leadership and frontline perspectives.",
    forumThread:
      "https://forums.eveonline.com/t/sennett-csm-21-reduce-friction-give-reasons-to-undock/519538",
  },
  {
    characterId: 93258439,
    name: "Seraph Essael",
    pitch:
      "Eve is not just a game, it's a hobby. I believe in putting the health of the game at the forefront of my campaign. I would like to see some of the utility and tools used by players brought back in to the game. I believe through clear dialogue both FC and the CSM can shape this game to last another 20 years and more.",
    forumThread:
      "https://forums.eveonline.com/t/seraph-essael-for-csm-21-better-tools-better-management-better-eve/518554",
  },
  {
    characterId: 2117608364,
    name: "Shivon",
    pitch:
      "My entire EVE experience has been in small groups. My focus is small gang, FW, wormholes, tournaments and any and all balance around ships and PvP. I see the role of CSM as a role of service and a chance to give back to this one of a kind game.",
    forumThread:
      "https://forums.eveonline.com/t/shivon-csm-21-a-continued-voice-towards-balance/519317",
  },
  {
    characterId: 998089053,
    name: "SkyMikerJedi",
    pitch:
      "Better alliances. Better tools. More time to die. As an alliance leader, I’ve seen how much time is spent working around limitations with spreadsheets, bots, external tools, and manual processes. I want practical improvements that make corporations and alliances easier to run.",
    forumThread:
      "https://forums.eveonline.com/t/skymikerjedi-for-csm-21-better-corporations-better-alliances-better-tools/519480",
  },
  {
    characterId: 2118223938,
    name: "Sopleb",
    pitch:
      "Long time EVE player since 2007, done almost all walks of EVE life. HS hauling and mining, Incursions, Wormholes, Null-sec. Ran Goonswarm Offensive Logistics, hot dropped structures. Currently running GSF's IT Infrastructure, maintaining systems so players can focus on content.",
    forumThread:
      "https://forums.eveonline.com/t/csm-21-sopleb-logistics-esi-and-less-busywork/519368",
  },
  {
    characterId: 206784144,
    name: "Styxx",
    pitch:
      "Played EVE actively, with no breaks, since June 2003. My knowledge base is pretty much the entire EVE game. I am running again as I do every year. You know you want to vote me in finally before I die or the game does. We both aren’t getting any younger.",
    forumThread:
      "https://forums.eveonline.com/t/vote-styxx-for-csm-21-you-know-you-want-to/518746",
  },
  {
    characterId: 670489426,
    name: "Switch 4",
    pitch:
      "Low-sec pirate, FW veteran, CEO of Heretic Army, SEDIT alliance exec, and Angel Cartel FC. I’m running to continue the work done for low-sec and FW, represent Pirate FW and small/mid-scale PvP, and keep a strong voice at the table as FC enters its next era of Faction Warfare.",
    forumThread:
      "https://forums.eveonline.com/t/switch-4-for-csm-21-low-sec-faction-warfare-pirate-fw-the-people-who-create-the-fights/518835",
  },
  {
    characterId: 2122924546,
    name: "tagknife",
    pitch:
      "Nullsec is MAD: frigates can headshot any staging Keepstar. K-IYNW and Atioth theorised it. 4-HWWF proved it. You cannot kill a tank with 9mm. I am running to end that truce. Keepstars take XL only. Fortizars take L+. Astrahus takes M+. Capitals undock.",
    forumThread:
      "https://forums.eveonline.com/t/tagknife-csm-21-candidate-for-an-active-and-healthy-nullsec/519207",
  },
  {
    characterId: 94108627,
    name: "Taran Lazarus",
    pitch:
      "I'm Taran Lazarus. I've watched EVE make many changes; I want to help it make some more. Word of mouth is the best form of advertising. More of us playing more of the game means more to talk about and more reasons for others to try it.",
    forumThread:
      "https://forums.eveonline.com/t/taran-lazarus-100-of-the-shots/519551",
  },
  {
    characterId: 155535009,
    name: "Tikka",
    pitch:
      "EVE veteran since launch, focused today on new players and Empire space. I've experienced high-sec mercenary PvP, PvE, mining, exploration and industry. I want to improve retention by closing the knowledge gap and helping new pilots discover EVE's depth without simplifying it.",
    forumThread:
      "https://forums.eveonline.com/t/tikka-for-csm-21-high-sec-and-new-player-retention/519634",
  },
  {
    characterId: 786205231,
    name: "xXNemXx",
    pitch:
      "I’m Nem, leader of BOSS Alliance. I’m running for CSM to represent the players who create their own content, build communities, fight wars, take risks, and make EVE’s sandbox what it is. I want to bring the perspective of active alliance leadership to the CSM.",
    forumThread:
      "https://forums.eveonline.com/t/xxnemxx-for-csm-21-your-alliance-your-identity-your-place-in-nullsec/519432",
  },
  {
    characterId: 95762124,
    name: "Zintage Enaka",
    pitch:
      "CSM 19 and CSM 20 veteran, GSF director and nullsec FC. Focused on ship balance and general life in nullsec. I’m looking to ease the busy work needed to live in nullsec, reduce barriers to content, and bring diversity and skill back into fleet doctrines.",
    forumThread:
      "https://forums.eveonline.com/t/zintage-enaka-for-csm21/519398",
  },
];

export const CSM_21: CsmElection = {
  number: 21,
  name: "CSM 21",
  campaign: { start: "2026-10-06", end: "2026-10-21" },
  voting: { start: "2026-10-22T11:00:00Z", end: "2026-11-03T11:00:00Z" },
  announcement:
    "https://www.eveonline.com/news/view/csm-21-candidate-announcements",
  forumCategory:
    "https://forums.eveonline.com/c/council-of-stellar-management/csm-campaigns/71",
  // Streamed live on Fenris Creations' Twitch channel (FC TV), 14:00 UTC
  // onwards. The VODs carry no chapter markers, so there is no per-candidate
  // timestamp to link to.
  interviews: [
    {
      title: "Day 1 · Part 1",
      url: "https://www.twitch.tv/videos/2903224915",
      date: "2026-10-17",
      minutes: 150,
    },
    {
      title: "Day 1 · Part 2",
      url: "https://www.twitch.tv/videos/2903508433",
      date: "2026-10-17",
      minutes: 210,
    },
    {
      title: "Day 2 · Part 1",
      url: "https://www.twitch.tv/videos/2904182515",
      date: "2026-10-18",
      minutes: 125,
    },
    {
      title: "Day 2 · Part 2",
      url: "https://www.twitch.tv/videos/2904382093",
      date: "2026-10-18",
      minutes: 236,
    },
  ],
  candidates: CSM_21_CANDIDATES,
};

/**
 * The red of the CSM 21 logo's "21". Takes white text at 5.9:1, so it works as a
 * filled badge or button background in both colour schemes.
 */
export const CSM_21_RED = "#c8161d";

/** The Fenris Creations Twitch channel, where the interviews were streamed. */
export const FENRIS_CREATIONS_TWITCH = "https://www.twitch.tv/fenriscreations";

const CSM_21_CANDIDATE_IDS: ReadonlySet<number> = new Set(
  CSM_21_CANDIDATES.map((candidate) => candidate.characterId),
);

/** Whether the character is standing for CSM 21. */
export function isCsm21Candidate(characterId: number | undefined): boolean {
  return characterId !== undefined && CSM_21_CANDIDATE_IDS.has(characterId);
}

/** In-page anchor of a candidate's card on `/csm`. */
export function csmCandidateAnchor(characterId: number): string {
  return `candidate-${characterId}`;
}
