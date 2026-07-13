---
"@jitaspace/web": patch
---

Made the Calendar page load much faster. It no longer fetches every event's full details and attendee list up front just to render the day view — the response status now comes straight from the calendar feed, and the owner and attendees load only when you open an event. Opening a busy calendar previously fired 100+ background requests before you could interact with it; now it fires almost none.
