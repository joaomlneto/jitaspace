---
"@jitaspace/web": patch
---

Changes to the site reach jita.space again. Between 5 and 9 August, eighteen consecutive attempts to publish the site failed before anything went out, so fixes and features that had already been merged simply never appeared. The cause was a step in the publishing process that also tried to bring the database's structure in line with the version of the site being published — whenever the two disagreed, it stopped, and nothing shipped. Most of the blocked releases had nothing to do with the database at all.

That step no longer runs when the site is published, so shipping a change to the site is no longer tied to the state of the database. Updating the database's structure is now a separate, deliberate action taken by hand.
