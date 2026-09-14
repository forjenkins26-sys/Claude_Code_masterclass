"""Generate the 5,000-row VWO test-case corpus used by the Advanced RAG demo.

Deterministic: a fixed seed means the same 5,000 rows every run, so the Qdrant
collection, the chunk-viewer screenshots and the teaching material all stay in
sync. No LLM call, no network, no cost.

Design constraint that shapes everything below
----------------------------------------------
This corpus is the *retrieval target* for a hybrid-search demo. If the rows are
near-duplicates, every retrieval metric lies: dense search will happily return
four interchangeable chunks and the rerank table will look impressive for the
wrong reason. So:

  * Actions belong to a FEATURE, never to a module. A module-wide action pool
    cross-produced against every feature is what generates rows like
    "Statistical Significance - delete a recording".
  * Each (feature, action) pair is emitted AT MOST ONCE. The row count is the
    size of the pair pool, so widening the corpus means writing more real
    scenarios, not repeating the ones already there.
  * Variation lives only in fields that do not change the meaning of the test
    (browser, device, plan, phrasing of the title). Expected Result is derived
    from the action and is never randomised.

Output is Jira CSV import format (one row = one issue), with column names Jira's
external-system importer maps without renaming.

    python generate_test_cases.py                 # -> vwo_test_cases_5000.csv
    python generate_test_cases.py --rows 500 --out sample.csv
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

TOTAL_DEFAULT = 5000
SEED = 20260914

# --------------------------------------------------------------------------
# FEATURES: feature name -> (module, component, labels, [(action, expected)...])
#
# Every action reads as something a QA engineer would actually write against
# that specific feature. Expected results are behavioural assertions, not
# restatements of the action.
# --------------------------------------------------------------------------

A = lambda *pairs: list(pairs)  # noqa: E731 - terse table literal


FEATURES: dict[str, dict] = {
    # ================= A/B Testing =================
    "Campaign Creation Wizard": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "campaigns"],
        "actions": A(
            ("create a new A/B campaign with two variations", "the campaign is saved in Draft status with control and variation 1 listed"),
            ("save a campaign with an empty name", "inline error 'Campaign name is required' appears and Save stays disabled"),
            ("save a campaign with a 300-character name", "the name is rejected with 'Campaign name must be 255 characters or fewer'"),
            ("create a campaign without selecting a goal", "the wizard blocks the final step with 'Select at least one goal'"),
            ("clone an existing campaign", "a Draft copy is created with '(Copy)' appended and the same variation content"),
            ("abandon the wizard halfway and return", "the partially filled campaign is restored from Draft with earlier steps intact"),
            ("create a campaign on a URL that does not match the SmartCode domain", "a warning 'This URL is outside your configured domains' is shown before saving"),
            ("create two campaigns with identical names", "both save successfully and are distinguished by campaign id"),
            ("launch a campaign directly from the wizard's final step", "the campaign moves to Running and starts bucketing new visitors"),
        ),
    },
    "Traffic Allocation": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "traffic"],
        "actions": A(
            ("set allocation to 50/50 between control and variation", "each variation shows 50% and the total reads exactly 100%"),
            ("set allocation totalling 110%", "error 'Total traffic must equal 100%' is shown and Save is blocked"),
            ("set allocation totalling 90%", "error 'Total traffic must equal 100%' is shown and Save is blocked"),
            ("allocate 0% to the control", "a confirmation dialog warns that no baseline data will be collected"),
            ("reduce overall campaign traffic to 10% of visitors", "only about 10% of eligible visitors are bucketed and the rest see the original page"),
            ("change allocation on a running campaign", "the new split applies to newly bucketed visitors while already-bucketed ones stay put"),
            ("enter a negative allocation value", "the field rejects the input and resets to the last valid value"),
            ("enter a fractional allocation such as 33.33%", "the fractional split is accepted and stored to two decimal places"),
        ),
    },
    "Variation Editor Sidebar": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "variations"],
        "actions": A(
            ("rename a variation from the sidebar", "the new name appears in the sidebar and on the reports page"),
            ("add a third variation to a Draft campaign", "the new variation 2 is added and traffic redistributes evenly across three variations"),
            ("add a variation to a Running campaign", "the variation is added and a banner warns that historical data is not comparable"),
            ("delete a variation from a Draft campaign", "the variation is removed and remaining traffic redistributes to 100%"),
            ("delete the control variation", "deletion is refused with 'The control cannot be removed'"),
            ("reorder variations by drag and drop", "the display order changes without altering variation ids or their traffic shares"),
        ),
    },
    "Campaign Scheduling": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "scheduling"],
        "actions": A(
            ("schedule a campaign to start tomorrow at 09:00", "the campaign stays in Scheduled status and begins bucketing at 09:00 in the account timezone"),
            ("schedule a start date in the past", "validation error 'Start date cannot be in the past' is shown"),
            ("schedule an end date earlier than the start date", "validation error 'End date must be after the start date' is shown"),
            ("let a scheduled end date elapse", "the campaign moves to Finished automatically and stops bucketing"),
            ("change the account timezone while a campaign is scheduled", "the stored start time is reinterpreted in the new timezone and the displayed time updates"),
            ("remove an end date from a scheduled campaign", "the campaign runs indefinitely until manually stopped"),
        ),
    },
    "Campaign Lifecycle": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "lifecycle"],
        "actions": A(
            ("pause a running campaign", "status becomes Paused and no new visitors are bucketed"),
            ("resume a paused campaign", "status returns to Running and bucketing resumes for new visitors only"),
            ("stop a campaign permanently", "status becomes Finished and the campaign can no longer be resumed"),
            ("archive a finished campaign", "the campaign leaves the active list and its reports remain readable"),
            ("restore an archived campaign", "the campaign returns to the active list in Paused status"),
            ("delete a campaign that has collected conversions", "a confirmation dialog warns the report data will be permanently removed"),
        ),
    },
    "Segment Targeting": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "segments"],
        "actions": A(
            ("target a campaign to new visitors only", "returning visitors are never bucketed into the campaign"),
            ("target a campaign by URL contains rule", "only pages whose URL contains the substring trigger the campaign"),
            ("target a campaign by a query parameter", "the campaign applies only when the parameter is present with the given value"),
            ("target a campaign by referrer domain", "visitors arriving from other referrers are excluded"),
            ("combine three targeting rules with AND", "a visitor must satisfy all three rules before being bucketed"),
            ("combine targeting rules with OR", "satisfying any one rule is enough to be bucketed"),
            ("save a segment with no conditions", "error 'Add at least one condition' is shown"),
        ),
    },
    "Split URL Test": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "split-url"],
        "actions": A(
            ("configure a split-URL test between two live pages", "visitors are redirected to their assigned variation URL and the assignment persists across sessions"),
            ("enter a variation URL without a scheme", "error 'Enter a valid URL' is shown for that variation"),
            ("configure a split-URL test where two variations share a URL", "error 'Variation URLs must be unique' is shown"),
            ("preserve query parameters through a split-URL redirect", "the original query string is appended to the redirect target"),
            ("configure a split-URL test across different domains", "the cross-domain cookie is written and visitor assignment survives the redirect"),
        ),
    },
    "Multivariate Test Setup": {
        "module": "A/B Testing", "component": "Testing", "labels": ["ab-testing", "mvt"],
        "actions": A(
            ("set up an MVT with 3 sections of 2 variations each", "the combination count reads 8 and every combination is listed"),
            ("set up an MVT with a section containing one variation", "the section is rejected with 'Each section needs at least two variations'"),
            ("set up an MVT producing more than 100 combinations", "a warning about required traffic volume is shown before launch"),
            ("exclude a specific combination from an MVT", "the excluded combination receives no traffic and drops out of the report"),
            ("view per-section results on an MVT report", "each section reports its own winning variation independently of the others"),
        ),
    },
    # ================= Heatmaps =================
    "Click Map": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "analytics"],
        "actions": A(
            ("open a click map for a page with recorded traffic", "the click overlay renders on the page screenshot with a click-count legend"),
            ("open a click map for a page with no recorded traffic", "the empty state 'No data captured yet for this page' is shown"),
            ("toggle the click overlay off", "the raw screenshot is shown with no colour overlay"),
            ("hover a hotspot on a click map", "a tooltip shows the element selector and its absolute click count"),
            ("open a click map for a URL whose screenshot failed to capture", "error 'Page screenshot unavailable' is shown with a retry action"),
            ("open a click map on a page whose layout changed since capture", "a staleness notice reports the screenshot capture date"),
        ),
    },
    "Scroll Map": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "scroll"],
        "actions": A(
            ("open a scroll map on a long page", "scroll-depth bands render with a fold marker and an average fold percentage"),
            ("read the average fold position from a scroll map", "the reported fold percentage matches the depth at which 50% of visitors stopped"),
            ("open a scroll map on a page shorter than the viewport", "a notice explains that scroll data is not meaningful for this page"),
            ("compare scroll depth between desktop and mobile", "two separate scroll maps are rendered against their own screenshots"),
        ),
    },
    "Heatmap Filters": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "filters"],
        "actions": A(
            ("filter a heatmap to the last 7 days", "only clicks recorded in the last 7 days are counted in the overlay"),
            ("filter a heatmap by a saved visitor segment", "the click counts drop to the segment subset and the segment name shows as an active chip"),
            ("filter a heatmap by traffic source", "only clicks from the selected source contribute to the overlay"),
            ("apply two mutually exclusive filters", "no results are returned and the empty state names the conflicting filters"),
            ("clear all heatmap filters", "the overlay returns to the unfiltered totals and all chips disappear"),
            ("filter a heatmap to a future date range", "validation prevents the selection and the previous range is retained"),
        ),
    },
    "Heatmap Device Breakdown": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "devices"],
        "actions": A(
            ("switch a heatmap from desktop to mobile", "the heatmap re-renders against the mobile screenshot and the device filter reads Mobile"),
            ("switch a heatmap to tablet", "the tablet screenshot is used and tablet-only clicks are counted"),
            ("switch to a device with no captured data", "the empty state explains that no sessions were recorded on that device"),
        ),
    },
    "Heatmap Export": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "export"],
        "actions": A(
            ("export a heatmap as PNG", "a PNG downloads containing both the overlay and the legend"),
            ("export a heatmap as PDF", "a PDF downloads with the heatmap image and the active filter summary"),
            ("export a heatmap while filters are applied", "the exported file reflects the filtered data, not the unfiltered totals"),
            ("export a heatmap with no data", "export is disabled with a tooltip explaining there is nothing to export"),
        ),
    },
    "Element-wise Click Report": {
        "module": "Heatmaps", "component": "Analytics", "labels": ["heatmap", "reports"],
        "actions": A(
            ("open the element-wise click report", "elements are listed in descending click order with counts and percentages"),
            ("sort the element-wise report by click percentage", "rows reorder by percentage and the sort indicator moves to that column"),
            ("search the element-wise report by CSS selector", "only rows whose selector matches the search text remain"),
            ("export the element-wise report to CSV", "a CSV downloads with one row per element and its click count"),
        ),
    },
    # ================= Session Recordings =================
    "Recording Player": {
        "module": "Session Recordings", "component": "Analytics", "labels": ["recordings", "player"],
        "actions": A(
            ("play a session recording end to end", "playback completes and the progress bar reaches 100% without stalling"),
            ("seek to the middle of a recording", "playback resumes from the sought position with the DOM state correctly rebuilt"),
            ("pause and resume a recording", "playback halts and continues from the same frame"),
            ("open a recording that is still being processed", "a 'Processing, check back shortly' state is shown instead of the player"),
            ("play a recording captured on a page using web fonts", "the recording renders with the original fonts rather than fallbacks"),
            ("open a recording whose retention window expired", "the message 'This recording is no longer available' is shown"),
        ),
    },
    "Playback Controls": {
        "module": "Session Recordings", "component": "Analytics", "labels": ["recordings", "playback"],
        "actions": A(
            ("change playback speed to 2x mid-playback", "playback continues from the same position at double speed"),
            ("change playback speed to 0.5x", "playback slows and the speed control reads 0.5x"),
            ("enable skip-inactivity", "the idle segments are compressed and the total playback time drops"),
            ("jump to the next click event using the timeline", "playback moves to the timestamp of the next recorded click"),
            ("toggle the console log panel during playback", "the console messages captured during the session are listed in time order"),
        ),
    },
    "Recording Filters": {
        "module": "Session Recordings", "component": "Analytics", "labels": ["recordings", "filters"],
        "actions": A(
            ("filter recordings by rage clicks", "only sessions containing at least one rage-click event are listed"),
            ("filter recordings by country", "only sessions from the selected country are listed and the country chip is active"),
            ("filter recordings by session duration over 5 minutes", "every listed session has a duration greater than five minutes"),
            ("filter recordings by visited URL", "only sessions that visited the specified URL remain in the list"),
            ("filter recordings by campaign participation", "only sessions bucketed into the chosen campaign are listed"),
            ("combine a country filter with a duration filter", "both conditions apply and the result count drops accordingly"),
        ),
    },
    "Recording Management": {
        "module": "Session Recordings", "component": "Analytics", "labels": ["recordings", "management"],
        "actions": A(
            ("star a recording for later review", "the recording shows a filled star and appears under the Starred filter"),
            ("add a note at a specific timestamp", "the note is saved against that timestamp and appears on the playback timeline"),
            ("delete a recording", "the recording leaves the list and a confirmation toast is shown"),
            ("share a recording link with a teammate", "a shareable URL is generated that opens the recording at the same timestamp"),
            ("share a recording with someone outside the account", "access is refused unless the link is explicitly marked public"),
            ("bulk-delete ten selected recordings", "all ten are removed after a single confirmation and the count updates"),
        ),
    },
    "Rage Click Detection": {
        "module": "Session Recordings", "component": "Analytics", "labels": ["recordings", "rage-click"],
        "actions": A(
            ("trigger seven rapid clicks on a dead element", "a rage-click event is recorded and flagged on the session timeline"),
            ("click an element three times slowly", "no rage-click event is recorded because the threshold is not met"),
            ("view the rage-click summary across sessions", "elements are ranked by rage-click frequency with affected session counts"),
        ),
    },
    # ================= Funnels =================
    "Funnel Builder": {
        "module": "Funnels", "component": "Analytics", "labels": ["funnels", "builder"],
        "actions": A(
            ("build a 3-step funnel from URL-based steps", "the funnel saves and the drop-off chart renders for all three steps"),
            ("build a funnel with a single step", "validation error 'A funnel needs at least two steps' is shown"),
            ("build a funnel with two identical steps", "warning 'Duplicate step detected' is shown and Save is blocked"),
            ("reorder funnel steps by drag and drop", "the step order updates and conversion rates recalculate for the new order"),
            ("delete a middle step from a saved funnel", "the step is removed and downstream conversion rates recalculate"),
            ("build a funnel mixing URL steps and custom-event steps", "both step types are accepted and evaluated in sequence"),
            ("build a funnel with ten steps", "all ten steps are saved and the chart renders horizontally scrollable"),
        ),
    },
    "Funnel Drop-off Report": {
        "module": "Funnels", "component": "Analytics", "labels": ["funnels", "reports"],
        "actions": A(
            ("read the drop-off percentage between two steps", "the drop-off equals 100 minus the step-to-step conversion rate"),
            ("open a funnel report with no visitors", "all steps read zero and an explanatory empty state is shown"),
            ("change the funnel report date range", "every step metric recalculates for the selected range only"),
            ("click a step to inspect the visitors who dropped off", "the matching session recordings for that drop-off are listed"),
            ("export a funnel report to CSV", "a CSV downloads with one row per step including entries, conversions and drop-off"),
        ),
    },
    "Funnel Segmentation": {
        "module": "Funnels", "component": "Analytics", "labels": ["funnels", "segments"],
        "actions": A(
            ("segment a funnel by traffic source", "one series per traffic source is drawn and the legend lists each source"),
            ("segment a funnel by device type", "each of desktop, mobile and tablet reports its own step conversion rates"),
            ("compare two date ranges on the same funnel", "both ranges render as separate series with a percentage-change column"),
            ("segment a funnel by a segment with no matching visitors", "the series renders flat at zero with a no-data note"),
        ),
    },
    # ================= Surveys =================
    "Survey Builder": {
        "module": "Surveys", "component": "Engage", "labels": ["surveys", "builder"],
        "actions": A(
            ("create an NPS survey with a follow-up question", "the survey saves and both questions appear in the preview in order"),
            ("add a multiple-choice question with five options", "all five options are saved and rendered in the preview"),
            ("add a free-text question with a 500-character limit", "the limit is enforced in the preview and the counter updates as text is typed"),
            ("publish a survey with no questions", "error 'Add at least one question before publishing' is shown"),
            ("reorder survey questions", "the new order is saved and the preview follows it"),
            ("add branching so a low NPS score routes to a different question", "a detractor is shown the branched question and a promoter is not"),
            ("delete a question that another question branches to", "deletion is blocked with an explanation of the broken branch"),
        ),
    },
    "Survey Targeting": {
        "module": "Surveys", "component": "Engage", "labels": ["surveys", "targeting"],
        "actions": A(
            ("target a survey to exit-intent on desktop only", "the survey triggers on exit-intent for desktop and never on mobile"),
            ("target a survey to fire after 30 seconds on page", "the survey appears only after the visitor has stayed 30 seconds"),
            ("target a survey to a scroll depth of 75%", "the survey appears once the visitor scrolls past three quarters of the page"),
            ("target a survey to a specific URL path", "the survey appears on that path only and nowhere else"),
            ("target a survey to returning visitors on mobile", "only returning mobile visitors are shown the survey"),
        ),
    },
    "Survey Throttling": {
        "module": "Surveys", "component": "Engage", "labels": ["surveys", "throttling"],
        "actions": A(
            ("throttle a survey to once per visitor per 30 days", "a visitor who dismissed it is not shown the survey again within 30 days"),
            ("throttle a survey to one response per session", "the survey does not reappear in the same session after one submission"),
            ("clear cookies after dismissing a throttled survey", "the survey reappears because throttling relies on the visitor cookie"),
            ("run two surveys targeting the same page", "only the higher-priority survey is shown and the other is suppressed"),
        ),
    },
    "Survey Response Report": {
        "module": "Surveys", "component": "Engage", "labels": ["surveys", "reports"],
        "actions": A(
            ("read the NPS score on the response report", "NPS equals the promoter percentage minus the detractor percentage"),
            ("export survey responses to CSV", "a CSV downloads with one row per response and one column per question"),
            ("filter survey responses by score band", "only responses in the selected promoter, passive or detractor band are listed"),
            ("read the response rate on a survey report", "the response rate equals submissions divided by impressions"),
            ("open a report for a survey with zero responses", "the report shows a zero-state rather than a computed NPS"),
            ("close a running survey", "the survey status becomes Closed and further responses are rejected"),
        ),
    },
    # ================= Personalization =================
    "Personalization Campaign": {
        "module": "Personalization", "component": "Personalize", "labels": ["personalization"],
        "actions": A(
            ("create a personalization campaign for returning visitors", "only returning visitors receive the personalised content"),
            ("preview a personalization campaign as a targeted visitor", "the preview renders the personalised variation behind a preview banner"),
            ("run two personalization campaigns on the same element", "the higher-priority campaign wins and the conflict is logged"),
            ("pause a live personalization campaign", "targeted visitors immediately see the original content again"),
            ("launch a personalization campaign with 100% of qualifying traffic", "every qualifying visitor receives the personalised variation"),
        ),
    },
    "Audience Builder": {
        "module": "Personalization", "component": "Personalize", "labels": ["personalization", "audiences"],
        "actions": A(
            ("stack three audience conditions with AND logic", "a visitor must satisfy all three conditions to qualify"),
            ("stack audience conditions with OR logic", "satisfying any single condition qualifies the visitor"),
            ("save an audience with no conditions", "error 'Add at least one condition' is shown"),
            ("build an audience from a custom visitor attribute", "visitors whose attribute matches are qualified and others are excluded"),
            ("build an audience on a first-party cookie value", "the cookie is read at evaluation time and drives qualification"),
            ("reuse a saved audience across two campaigns", "both campaigns evaluate the same audience definition and edits propagate to both"),
        ),
    },
    "Geo Targeting": {
        "module": "Personalization", "component": "Personalize", "labels": ["personalization", "geo"],
        "actions": A(
            ("target personalization by city", "only visitors resolving to that city receive the variation"),
            ("target personalization by country", "visitors outside the selected country see the original content"),
            ("target personalization by a list of five countries", "a visitor from any of the five countries qualifies"),
            ("target a visitor whose IP cannot be geo-resolved", "the visitor does not qualify and is served the original content"),
            ("target personalization by timezone rather than country", "the qualification follows the browser-reported timezone"),
        ),
    },
    "Content Replacement": {
        "module": "Personalization", "component": "Personalize", "labels": ["personalization", "content"],
        "actions": A(
            ("replace a hero headline through the visual editor", "targeted visitors see the new headline and everyone else sees the original"),
            ("replace an image source for a targeted audience", "the substitute image loads for qualifying visitors only"),
            ("inject a promotional banner above the fold", "the banner renders for qualifying visitors without shifting other content"),
            ("replace content on an element rendered after page load", "the replacement waits for the element and then applies without flicker"),
            ("replace content on an element that never appears", "no change is applied and the failure is recorded in the campaign log"),
        ),
    },
    # ================= SmartCode / Platform =================
    "SmartCode Installation": {
        "module": "SmartCode", "component": "Platform", "labels": ["smartcode", "platform"],
        "actions": A(
            ("install SmartCode directly in the page head", "the verification returns Installed with the detected account id"),
            ("install SmartCode via Google Tag Manager", "the tag fires on page load and verification succeeds"),
            ("install SmartCode below the closing body tag", "the verification warns that late placement can cause content flicker"),
            ("install SmartCode with the wrong account id", "the verification reports that the detected account does not match this account"),
            ("install SmartCode twice on the same page", "a duplicate-installation warning is raised and only one instance initialises"),
        ),
    },
    "SmartCode Verification": {
        "module": "SmartCode", "component": "Platform", "labels": ["smartcode", "verification"],
        "actions": A(
            ("verify SmartCode on a correctly instrumented page", "the verification returns Installed with a green status"),
            ("verify SmartCode on a page where it is absent", "the verification returns 'SmartCode not found on this page' with install steps"),
            ("verify SmartCode on a page behind basic auth", "the verification fails with 'Page could not be reached' plus manual-check instructions"),
            ("verify SmartCode on a page that blocks the crawler by robots.txt", "the verification explains the crawler was disallowed and offers manual verification"),
            ("re-verify SmartCode after fixing the installation", "the status flips from Not Found to Installed without a support ticket"),
        ),
    },
    "SmartCode Loading Behaviour": {
        "module": "SmartCode", "component": "Platform", "labels": ["smartcode", "performance"],
        "actions": A(
            ("load SmartCode asynchronously on a slow page", "the page render is not blocked and campaigns still apply before first paint"),
            ("load SmartCode with a content-security policy in place", "the script loads only when its domain is allow-listed in the CSP"),
            ("apply a campaign in a single-page app after a route change", "the campaign re-applies to the new route without a full page reload"),
            ("apply a campaign on a page using server-side rendering", "the variation is applied on hydration without a visible flash of original content"),
            ("load SmartCode when the CDN is unreachable", "the page renders normally with no campaign applied and no visible error"),
        ),
    },
    "Consent Mode": {
        "module": "SmartCode", "component": "Platform", "labels": ["smartcode", "consent", "privacy"],
        "actions": A(
            ("block SmartCode until consent is granted", "no tracking request is sent before consent and requests begin immediately after"),
            ("decline cookie consent", "no cookie is written and the visitor is excluded from every campaign"),
            ("grant consent after initially declining", "tracking begins from that point and earlier activity is not backfilled"),
            ("revoke consent mid-session", "tracking stops immediately and the visitor cookie is cleared"),
        ),
    },
    # ================= Integrations =================
    "Google Analytics 4 Integration": {
        "module": "Integrations", "component": "Platform", "labels": ["integrations", "ga4"],
        "actions": A(
            ("connect a GA4 property to the account", "the connection shows Active and campaign events begin appearing in GA4"),
            ("disconnect a GA4 property", "the integration shows Inactive and no further events are forwarded"),
            ("connect GA4 with insufficient Google permissions", "the connection fails with an explicit permissions error"),
            ("map a VWO campaign to a GA4 custom dimension", "the campaign and variation names arrive in that dimension"),
            ("connect the same GA4 property to two VWO accounts", "both connections succeed and events carry their own account identifiers"),
        ),
    },
    "Webhook Integration": {
        "module": "Integrations", "component": "Platform", "labels": ["integrations", "webhooks"],
        "actions": A(
            ("configure a webhook for campaign-status changes", "the endpoint receives a POST containing the campaign id and new status"),
            ("configure a webhook with an unreachable endpoint", "delivery is retried with backoff and the failure is visible in the delivery log"),
            ("configure a webhook with a signing secret", "each delivery carries a signature header that verifies against the secret"),
            ("configure a webhook to an http endpoint", "the configuration is refused because only https endpoints are accepted"),
            ("replay a failed webhook delivery from the log", "the payload is re-sent unchanged and the new attempt is logged separately"),
            ("delete a configured webhook", "no further deliveries are attempted and past delivery history remains readable"),
        ),
    },
    "Slack Notifications": {
        "module": "Integrations", "component": "Platform", "labels": ["integrations", "slack"],
        "actions": A(
            ("send campaign-win notifications to a Slack channel", "a Slack message is posted naming the campaign and the winning variation"),
            ("send notifications to a private Slack channel", "posting succeeds only after the app is invited to that channel"),
            ("revoke the Slack app's access", "the notifications stop and the integration surfaces an auth error"),
            ("mute notifications for one campaign", "that campaign produces no Slack messages while others continue"),
        ),
    },
    "Data Export API": {
        "module": "Integrations", "component": "Platform", "labels": ["integrations", "api"],
        "actions": A(
            ("call the Data Export API with a valid token", "HTTP 200 is returned with the requested report rows as JSON"),
            ("call the Data Export API with an expired token", "HTTP 401 is returned with error code 'token_expired'"),
            ("call the Data Export API with no Authorization header", "HTTP 401 is returned with error code 'missing_credentials'"),
            ("exceed the Data Export API rate limit", "HTTP 429 is returned together with a Retry-After header"),
            ("request a report for a campaign in another account", "HTTP 403 is returned and no data is disclosed"),
            ("request a date range wider than the plan allows", "HTTP 400 is returned naming the maximum permitted range"),
            ("paginate through a large Data Export result", "each page returns the page size requested and a cursor for the next page"),
        ),
    },
    "Segment Integration": {
        "module": "Integrations", "component": "Platform", "labels": ["integrations", "segment"],
        "actions": A(
            ("stream VWO campaign events into Segment", "events arrive in the Segment debugger with campaign and variation traits"),
            ("configure the Segment write key incorrectly", "the integration reports an invalid write key and forwards nothing"),
            ("stop the Segment stream", "no further events are delivered and the integration reads Inactive"),
        ),
    },
    # ================= Reports =================
    "Campaign Report": {
        "module": "Reports", "component": "Analytics", "labels": ["reports", "analytics"],
        "actions": A(
            ("open a campaign report with sufficient sample size", "a winner is declared with probability-to-beat-baseline above 95%"),
            ("open a campaign report with insufficient sample size", "the report reads 'Not enough data yet' instead of declaring a winner"),
            ("open a report for a campaign that never received traffic", "every metric reads zero and an explanatory empty state is shown"),
            ("change the report date range", "all metrics recalculate for the selected range only"),
            ("compare a variation against the control on conversion rate", "relative uplift and its confidence interval are displayed for that variation"),
            ("open a report for an archived campaign", "the historical report renders read-only with no edit controls"),
        ),
    },
    "Statistical Significance": {
        "module": "Reports", "component": "Analytics", "labels": ["reports", "statistics"],
        "actions": A(
            ("reach 95% probability to beat baseline", "the variation is marked as a winner and the significance badge turns green"),
            ("read significance at 80% probability to beat baseline", "the variation is shown as inconclusive rather than winning"),
            ("read significance when a variation is losing", "the report marks it as underperforming with its own confidence interval"),
            ("read the smallest detectable effect on a running campaign", "the report states the minimum uplift detectable at the current sample size"),
            ("read the projected duration to significance", "the report estimates remaining days from the current conversion rate and traffic"),
        ),
    },
    "Segmented Report": {
        "module": "Reports", "component": "Analytics", "labels": ["reports", "segments"],
        "actions": A(
            ("segment a campaign report by device type", "one row per device type is shown with its own conversion rate"),
            ("segment a campaign report by browser", "each browser reports independently and the totals still reconcile"),
            ("segment a campaign report by new versus returning visitors", "both cohorts report separately with their own uplift figures"),
            ("segment a report by a segment matching no visitors", "the segmented rows read zero with a no-data note"),
            ("apply two segments at once to a report", "the intersection of both segments is reported"),
        ),
    },
    "Revenue Report": {
        "module": "Reports", "component": "Analytics", "labels": ["reports", "revenue"],
        "actions": A(
            ("open a revenue report for a campaign with a revenue goal", "total revenue, revenue per visitor and uplift are shown per variation"),
            ("record a refund against a tracked revenue conversion", "the reported revenue decreases by the refunded amount"),
            ("record revenue in two currencies on one campaign", "amounts are converted to the account currency and the rate used is disclosed"),
            ("record a zero-value revenue conversion", "the conversion counts toward the goal while contributing no revenue"),
            ("record a negative revenue value", "the value is rejected and the conversion is not recorded"),
        ),
    },
    "Report Export": {
        "module": "Reports", "component": "Analytics", "labels": ["reports", "export"],
        "actions": A(
            ("export a campaign report to CSV", "a CSV downloads containing every variation row and every goal column"),
            ("export a campaign report to PDF", "a PDF downloads with the charts rendered and the date range in the header"),
            ("schedule a weekly emailed report", "the report arrives by email every week at the configured time"),
            ("export a report while a segment is applied", "the export contains the segmented figures rather than the totals"),
            ("export a report with more than 100,000 rows", "the export is queued and a download link is emailed when ready"),
        ),
    },
    # ================= User Management =================
    "Invite User": {
        "module": "User Management", "component": "Account", "labels": ["users", "account"],
        "actions": A(
            ("invite a user with the Analyst role", "an invitation email is sent and the user appears as Pending with role Analyst"),
            ("invite a user whose email already has access", "error 'This user already has access to this account' is shown"),
            ("invite a user with a malformed email address", "inline error 'Enter a valid email address' is shown"),
            ("invite users beyond the seat limit of the plan", "the invitation is blocked with an upgrade prompt naming the seat limit"),
            ("resend a pending invitation", "a fresh invitation email is sent and the earlier link is invalidated"),
            ("revoke a pending invitation", "the invitation link stops working and the row leaves the pending list"),
            ("accept an invitation after it has expired", "the link is rejected with 'This invitation has expired'"),
        ),
    },
    "Role Permissions": {
        "module": "User Management", "component": "Account", "labels": ["users", "permissions"],
        "actions": A(
            ("downgrade an Admin to a Viewer", "the user loses edit controls and campaign edit pages become read-only"),
            ("promote an Analyst to Admin", "the user gains access to billing and user-management screens"),
            ("remove the last remaining Account Owner", "removal is refused with 'An account must retain at least one owner'"),
            ("remove a user from the account", "access is revoked immediately and the removal is written to the audit log"),
            ("restrict a user to a single project", "the user sees only that project and cannot list the others"),
            ("attempt an admin-only action as a Viewer", "the request is refused with HTTP 403 and no state changes"),
        ),
    },
    "SSO Login": {
        "module": "User Management", "component": "Account", "labels": ["users", "sso", "security"],
        "actions": A(
            ("log in through SAML SSO", "the user is authenticated and lands on the dashboard without a password prompt"),
            ("log in through SSO with an unlinked email domain", "access is denied with 'Your domain is not configured for SSO'"),
            ("log in through SSO when the IdP certificate has expired", "login fails with a signature-validation error and nothing is provisioned"),
            ("log in through SSO for a user who does not yet exist", "the user is just-in-time provisioned with the default role"),
            ("log in with a password while SSO is enforced", "password login is refused and the user is redirected to the IdP"),
        ),
    },
    "Two-Factor Authentication": {
        "module": "User Management", "component": "Account", "labels": ["users", "2fa", "security"],
        "actions": A(
            ("enable two-factor authentication", "a QR code is shown and subsequent logins prompt for a TOTP code"),
            ("enter an incorrect two-factor code three times", "the attempts are rejected and the account is temporarily locked"),
            ("log in with a recovery code", "login succeeds and that recovery code is consumed and cannot be reused"),
            ("disable two-factor authentication", "the re-authentication prompt appears first and later logins skip the TOTP step"),
            ("enter a TOTP code from the previous time window", "the code is accepted inside the clock-skew tolerance"),
        ),
    },
    "Audit Log": {
        "module": "User Management", "component": "Account", "labels": ["users", "audit"],
        "actions": A(
            ("view the audit log after a permission change", "an entry records the actor, target user, old role, new role and timestamp"),
            ("filter the audit log by actor", "only entries generated by that user remain"),
            ("filter the audit log by date range", "only entries inside the range are listed"),
            ("export the audit log to CSV", "a CSV downloads with one row per audited event"),
            ("attempt to delete an audit-log entry", "no delete control exists and the API rejects the attempt"),
        ),
    },
    # ================= Billing =================
    "Plan Upgrade": {
        "module": "Billing", "component": "Account", "labels": ["billing", "upgrade"],
        "actions": A(
            ("upgrade from Growth to Pro", "the new plan is active immediately and a prorated invoice is generated"),
            ("upgrade with a declined card", "the upgrade fails, the plan is unchanged and the decline reason is shown"),
            ("upgrade mid-billing-period", "only the remaining days of the period are charged at the new rate"),
            ("upgrade to Enterprise from the self-serve screen", "the flow routes to a sales contact form instead of charging a card"),
        ),
    },
    "Plan Downgrade": {
        "module": "Billing", "component": "Account", "labels": ["billing", "downgrade"],
        "actions": A(
            ("downgrade from Pro to Growth", "the downgrade is scheduled for period end rather than applied instantly"),
            ("downgrade while using a Pro-only feature", "a warning names the features that will be lost at period end"),
            ("cancel a scheduled downgrade", "the account stays on the current plan and the schedule is cleared"),
            ("cancel a subscription", "the plan is marked Cancelled at period end and access continues until then"),
        ),
    },
    "Payment Method": {
        "module": "Billing", "component": "Account", "labels": ["billing", "payments"],
        "actions": A(
            ("add a credit card as the payment method", "the card is saved with only its last four digits displayed"),
            ("add an expired credit card", "error 'This card has expired' is shown and the card is not saved"),
            ("add a card that fails 3-D Secure", "the challenge failure is surfaced and no card is stored"),
            ("replace an existing card with a new one", "the new card becomes the default and the old one is removed"),
            ("remove the only payment method on a paid plan", "removal is refused while an active subscription exists"),
        ),
    },
    "Invoice History": {
        "module": "Billing", "component": "Account", "labels": ["billing", "invoices"],
        "actions": A(
            ("download an invoice PDF", "a PDF downloads showing plan, billing period and tax breakdown"),
            ("add a VAT number to the billing profile", "the VAT number appears on subsequent invoices"),
            ("view invoices for a period before the account existed", "the list is empty with an explanatory note"),
            ("apply an invalid coupon code", "error 'This coupon code is not valid' is shown and the total is unchanged"),
            ("apply an expired coupon code", "error 'This coupon has expired' is shown and no discount is applied"),
        ),
    },
    "MTU Overage": {
        "module": "Billing", "component": "Account", "labels": ["billing", "mtu"],
        "actions": A(
            ("exceed the monthly tracked-user limit", "an overage banner is shown and tracking continues without data loss"),
            ("exceed the tracked-user limit by more than 50%", "an overage invoice is raised at the documented per-user rate"),
            ("read the tracked-user counter mid-month", "the counter reflects unique visitors tracked since the period started"),
            ("start a new billing period after an overage", "the tracked-user counter resets to zero"),
        ),
    },
    # ================= Visual Editor =================
    "Element Selection": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "selection"],
        "actions": A(
            ("select an element by clicking it in the editor", "the element is highlighted and its generated selector is shown"),
            ("select a parent element using the breadcrumb", "selection moves up the DOM tree and the selector updates"),
            ("select an element inside an iframe", "the editor selects the element within the iframe and applies changes there"),
            ("select an element that only exists after a hover", "the editor offers hover-state capture so the element can be targeted"),
            ("edit a page that blocks framing", "the editor falls back to code mode with an explanatory message"),
        ),
    },
    "Text Editing": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "text"],
        "actions": A(
            ("edit button text in the visual editor", "the new text renders in the preview and is saved to the variation"),
            ("edit text containing an emoji", "the emoji is preserved in the variation and rendered correctly to visitors"),
            ("edit text on an element bound to a JavaScript framework", "the change survives re-render because the editor reapplies it on mutation"),
            ("clear all text from an element", "the element renders empty rather than falling back to the original copy"),
            ("paste rich text copied from a document", "formatting is stripped and only plain text is inserted"),
        ),
    },
    "CSS Editing": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "css"],
        "actions": A(
            ("change an element's background colour", "the colour applies in the preview and is persisted as a CSS rule"),
            ("hide an element in a variation", "the element is not rendered for visitors bucketed into that variation"),
            ("add a CSS rule with invalid syntax", "the editor flags the invalid declaration and refuses to save it"),
            ("override a style marked important on the original page", "the variation rule wins because it is written with equal specificity and importance"),
            ("change the font size of a heading", "the new size renders in the preview and to targeted visitors"),
        ),
    },
    "Custom JavaScript": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "javascript"],
        "actions": A(
            ("add custom JavaScript to a variation", "the script executes for visitors in that variation only"),
            ("add custom JavaScript with a syntax error", "the editor flags the syntax error and blocks saving the variation"),
            ("add JavaScript that throws at runtime", "the error is caught, the page keeps working and the error is reported in the campaign log"),
            ("add JavaScript that waits for a late-loading element", "the code runs once the element appears rather than failing silently"),
            ("add site-wide JavaScript at account level", "the code runs on every page regardless of campaign membership"),
        ),
    },
    "Editor Undo Redo": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "undo"],
        "actions": A(
            ("undo the last three edits", "all three are reverted in reverse order and the preview matches the original"),
            ("redo an undone edit", "the edit is reapplied and the preview reflects it"),
            ("undo past the start of the session", "the undo control is disabled once no further history exists"),
            ("undo after saving the variation", "the undo affects the working copy and the saved variation is only changed on the next save"),
        ),
    },
    "Editor Device Preview": {
        "module": "Visual Editor", "component": "Testing", "labels": ["visual-editor", "responsive"],
        "actions": A(
            ("switch the editor to mobile preview", "the preview renders at mobile width and mobile-only edits apply"),
            ("apply a change in mobile preview only", "the change applies on mobile viewports and desktop keeps the original"),
            ("switch to tablet preview after editing on desktop", "the desktop edits remain visible unless overridden for tablet"),
        ),
    },
    # ================= Goals & Metrics =================
    "Click Goal": {
        "module": "Goals & Metrics", "component": "Testing", "labels": ["goals", "clicks"],
        "actions": A(
            ("create a click goal on a CSS selector", "one conversion is recorded per visitor who clicks the element"),
            ("create a click goal with an invalid CSS selector", "error 'Enter a valid CSS selector' is shown"),
            ("create a click goal on an element matching many nodes", "a click on any matching node records the conversion"),
            ("click a goal element twice in one session", "only one conversion is counted for that visitor"),
            ("create a click goal on an element added after page load", "the listener is delegated so late elements still record conversions"),
        ),
    },
    "Revenue Goal": {
        "module": "Goals & Metrics", "component": "Testing", "labels": ["goals", "revenue"],
        "actions": A(
            ("create a revenue goal with a currency", "revenue is recorded in that currency and totals use its symbol"),
            ("post a revenue value through the JavaScript API", "the amount is attributed to the visitor's variation"),
            ("post a revenue value with more than two decimal places", "the value is rounded to two decimals before storage"),
            ("post a non-numeric revenue value", "the call is rejected and no conversion is recorded"),
        ),
    },
    "Custom Conversion Goal": {
        "module": "Goals & Metrics", "component": "Testing", "labels": ["goals", "custom"],
        "actions": A(
            ("fire a custom conversion goal through the JavaScript API", "the conversion is recorded against the visitor's variation"),
            ("fire a custom goal before SmartCode has initialised", "the call is queued and processed once initialisation completes"),
            ("fire a custom goal for a visitor not in any campaign", "the call is accepted and recorded against no campaign"),
            ("fire the same custom goal twice for one visitor", "only one conversion is counted per visitor per goal"),
            ("create two goals with the same name", "error 'A goal with this name already exists' is shown"),
        ),
    },
    "Engagement Metric": {
        "module": "Goals & Metrics", "component": "Testing", "labels": ["goals", "engagement"],
        "actions": A(
            ("track time on page as an engagement metric", "the average time on page is reported per variation"),
            ("track bounce rate as an engagement metric", "the bounce rate is reported per variation and excludes engaged single-page sessions"),
            ("track pages per session", "the average page count per session is reported per variation"),
            ("track an engagement metric on a campaign with one page view per visitor", "the pages-per-session figure reads exactly one for every variation"),
        ),
    },
    # ================= Data Privacy =================
    "GDPR Data Request": {
        "module": "Data Privacy", "component": "Platform", "labels": ["privacy", "gdpr"],
        "actions": A(
            ("submit a data-deletion request for a visitor id", "all data for that visitor id is deleted and a confirmation is recorded"),
            ("submit a data-deletion request for an unknown visitor id", "the request completes with 'No data found for this identifier'"),
            ("submit a data-export request for a visitor id", "a machine-readable export of that visitor's stored data is produced"),
            ("submit a deletion request while recordings are still processing", "the in-flight recordings are dropped rather than completed and stored"),
        ),
    },
    "PII Masking": {
        "module": "Data Privacy", "component": "Platform", "labels": ["privacy", "pii"],
        "actions": A(
            ("mask input fields in session recordings", "masked fields render as asterisks in playback and raw values are never stored"),
            ("mask an element by CSS selector", "the element's text is redacted in every recording and heatmap"),
            ("unmask a field that was previously masked", "only sessions recorded after the change contain the unmasked value"),
            ("record a page containing a credit-card field", "the card field is masked by default without explicit configuration"),
        ),
    },
    "IP Anonymisation": {
        "module": "Data Privacy", "component": "Platform", "labels": ["privacy", "ip"],
        "actions": A(
            ("enable IP anonymisation", "the stored IP addresses have their final octet zeroed"),
            ("enable IP anonymisation and then use city-level geo targeting", "geo resolution degrades to country level and the limitation is disclosed"),
            ("disable IP anonymisation", "the full IP addresses are stored from that point onward only"),
        ),
    },
    "Data Retention Policy": {
        "module": "Data Privacy", "component": "Platform", "labels": ["privacy", "retention"],
        "actions": A(
            ("set the retention policy to 90 days", "the data older than 90 days is purged on the next retention run"),
            ("shorten the retention policy from 365 to 30 days", "a confirmation warns that data between 30 and 365 days old will be deleted"),
            ("read a report spanning a period already purged by retention", "the purged range reads zero with a retention notice"),
            ("set a retention period longer than the plan permits", "the value is refused and the plan maximum is named"),
        ),
    },
}

TEST_TYPES_POSITIVE = ["Functional", "Functional", "Regression", "Smoke", "UI", "Integration"]
TEST_TYPES_NEGATIVE = ["Negative", "Negative", "Boundary", "Security"]

PRIORITIES = ["P0 - Critical", "P1 - High", "P2 - Medium", "P3 - Low"]
BROWSERS = ["Chrome 128", "Firefox 129", "Safari 17", "Edge 128"]
DEVICES = [
    "Desktop 1920x1080",
    "Desktop 1440x900",
    "iPhone 14 (390x844)",
    "Pixel 7 (412x915)",
    "iPad Air (820x1180)",
]
ENVIRONMENTS = ["Staging", "Pre-Prod", "Production"]
PLANS = ["Growth", "Pro", "Enterprise"]
ROLES = ["Admin", "Analyst", "Viewer", "Account Owner"]
AUTOMATION = ["Automated - Playwright", "Automated - Cypress", "Manual", "Candidate for automation"]

# Phrasing variation. Retrieval has to bridge the gap between how a test case is
# titled and how someone searches for it, so the corpus must carry that gap.
TITLE_PATTERNS = [
    "Verify user can {action}",
    "Verify {feature} allows the user to {action}",
    "{feature} - {action}",
    "Check that the user is able to {action}",
    "Validate behaviour when the user attempts to {action}",
    "As {article} {role}, {action}",
    "{module} / {feature}: {action}",
    "Ensure the system handles an attempt to {action}",
    "Confirm the outcome when the user tries to {action}",
]

PRECONDITION_POOL = [
    "User is logged in to the VWO dashboard",
    "SmartCode is installed and verified on the test site",
    "Account is on the {plan} plan",
    "User holds the {role} role on the account",
    "At least one campaign already exists on the account",
    "Test site {site} is reachable",
    "Browser cache and cookies are cleared",
    "Tracked-user quota for the period is not exhausted",
    "Account timezone is set to UTC",
]

SITES = [
    "https://staging.vwo-demo.com",
    "https://shop.vwo-demo.com",
    "https://blog.vwo-demo.com",
    "https://checkout.vwo-demo.com",
]

# Words that mark an action as testing a failure path. Labelling such a row
# "Functional" would put a wrong Test Type in the data, and the corpus is meant
# to be trustworthy enough to answer questions about itself.
NEGATIVE_MARKERS = (
    "error",
    "blocked",
    "refused",
    "denied",
    "rejected",
    "invalid",
    "expired",
    "not valid",
    "not found",
    "fails",
    "403",
    "401",
    "429",
    "400",
)


def _sentence_case(text: str) -> str:
    """Capitalise the first letter only.

    str.capitalize() would lower-case the rest, turning "on Safari for iOS"
    into "on safari for ios" — product names must survive.
    """
    return text[0].upper() + text[1:] if text else text


def _article(word: str) -> str:
    """'a' or 'an' for a role name.

    Roles are a closed set (Admin / Analyst / Viewer / Account Owner), so a
    vowel check is sufficient here and no exception list is needed.
    """
    return "an" if word[0].lower() in "aeiou" else "a"


def _is_negative(expected: str) -> bool:
    low = expected.lower()
    return any(m in low for m in NEGATIVE_MARKERS)


def build_pairs() -> list[tuple[str, str, str, str, str, list[str]]]:
    """Every (feature, action) scenario exactly once.

    Returned tuples: (module, feature, component, action, expected, labels).
    """
    pairs = []
    for feature, spec in FEATURES.items():
        for action, expected in spec["actions"]:
            pairs.append(
                (spec["module"], feature, spec["component"], action, expected, spec["labels"])
            )
    return pairs


def _title(rng: random.Random, module: str, feature: str, action: str, role: str) -> str:
    text = rng.choice(TITLE_PATTERNS).format(
        action=action, feature=feature, module=module, role=role, article=_article(role)
    )
    return _sentence_case(text)


def _steps(
    rng: random.Random,
    module: str,
    feature: str,
    action: str,
    site: str,
    ctx: dict | None = None,
) -> str:
    """Numbered steps in one cell.

    Jira renders a '\\n' inside a quoted CSV cell as a line break, so the steps
    stay a single field instead of breaking the row apart.
    """
    steps = []
    if ctx is not None:
        # The context is a step, not decoration: a tester has to put themselves
        # in that environment before the rest of the steps mean anything.
        steps.append(f"Open the session {ctx['where']}")
    steps += [
        rng.choice(
            [
                "Log in to the VWO dashboard",
                "Open the VWO dashboard and sign in with valid credentials",
                "Authenticate into VWO using an account with the required permissions",
            ]
        ),
        f"Navigate to {module} > {feature}",
        f"Attempt to {action}",
        rng.choice(
            [
                "Save the change and wait for the confirmation toast",
                "Apply the change and reload the page",
                "Submit the form and observe the response",
                "Observe the resulting state without refreshing the page",
            ]
        ),
        f"Open {site} in an incognito window and confirm the visitor-facing behaviour",
    ]
    return "\n".join(f"{i}. {s}" for i, s in enumerate(steps, 1))


def _preconditions(rng: random.Random, plan: str, role: str, site: str) -> str:
    picks = rng.sample(PRECONDITION_POOL, k=rng.randint(2, 3))
    return "\n".join(f"- {p.format(plan=plan, role=role, site=site)}" for p in picks)


# --------------------------------------------------------------------------
# Execution contexts
#
# 344 hand-written scenarios do not make 5,000 rows on their own, and repeating
# a scenario verbatim would plant near-duplicates in the retrieval corpus.
#
# What a real suite of this size actually looks like: one scenario executed
# across several environments, each a separate test case with its own id, its
# own run and its own result. That is a genuine distinction, not padding — the
# same action really can pass on Chrome desktop and fail on Safari iOS, and the
# expected result names the context it is asserted in.
#
# Consequence for the demo, stated plainly: the corpus has 344 SEMANTIC clusters
# spread over 5,000 rows. That is the interesting case for hybrid search, not a
# weakness — dense retrieval alone will pull four rows from one cluster, while
# the Qdrant payload filters (module / browser / device / plan) are what isolate
# the row someone actually meant.
# --------------------------------------------------------------------------

CONTEXTS: list[dict] = [
    {"slug": "chrome-desktop", "browser": "Chrome 128", "device": "Desktop 1920x1080", "where": "on Chrome desktop at 1920x1080"},
    {"slug": "chrome-laptop", "browser": "Chrome 128", "device": "Desktop 1440x900", "where": "on Chrome at laptop width (1440x900)"},
    {"slug": "firefox-desktop", "browser": "Firefox 129", "device": "Desktop 1920x1080", "where": "on Firefox desktop"},
    {"slug": "safari-desktop", "browser": "Safari 17", "device": "Desktop 1440x900", "where": "on Safari desktop"},
    {"slug": "edge-desktop", "browser": "Edge 128", "device": "Desktop 1920x1080", "where": "on Edge desktop"},
    {"slug": "safari-ios", "browser": "Safari 17", "device": "iPhone 14 (390x844)", "where": "on Safari for iOS at 390x844"},
    {"slug": "chrome-android", "browser": "Chrome 128", "device": "Pixel 7 (412x915)", "where": "on Chrome for Android at 412x915"},
    {"slug": "safari-ipad", "browser": "Safari 17", "device": "iPad Air (820x1180)", "where": "on iPad Air in landscape"},
    {"slug": "growth-plan", "plan": "Growth", "where": "on a Growth-plan account"},
    {"slug": "pro-plan", "plan": "Pro", "where": "on a Pro-plan account"},
    {"slug": "enterprise-plan", "plan": "Enterprise", "where": "on an Enterprise-plan account"},
    {"slug": "as-admin", "role": "Admin", "where": "for a user holding the Admin role"},
    {"slug": "as-analyst", "role": "Analyst", "where": "for a user holding the Analyst role"},
    {"slug": "as-owner", "role": "Account Owner", "where": "for the Account Owner"},
    {"slug": "staging", "env": "Staging", "where": "against the Staging environment"},
    {"slug": "production", "env": "Production", "where": "against Production"},
]


# Every expected clause is prefixed with a context ("On Safari desktop, ") and
# must read as a grammatical sentence afterwards. An author adding a bare clause
# such as "campaign is saved" would produce "On Safari desktop, campaign is
# saved" — wrong, and invisible in a 5,000-row file. Words that legitimately
# open a clause without a determiner are listed here; anything else is a typo.
_VALID_CLAUSE_OPENERS = {
    "the", "a", "an", "that", "this", "these", "those", "its", "their",
    "every", "each", "all", "both", "no", "only", "one", "two", "any",
    "http", "nps", "access", "playback", "validation", "deletion", "removal",
    "selection", "export", "formatting", "revenue", "geo", "password",
    "tracking", "login", "posting", "delivery", "returning", "satisfying",
    "targeted", "masked", "elements", "events", "steps", "rows", "amounts",
    "visitors", "total", "relative", "inline", "error", "warning", "status",
    "scroll-depth", "both", "verification", "notifications", "re-authentication",
}


def lint_clauses() -> list[str]:
    """Return every expected clause that would not read correctly when prefixed."""
    bad = []
    for feature, spec in FEATURES.items():
        for _, expected in spec["actions"]:
            opener = expected.split()[0].lower().rstrip(",")
            if opener not in _VALID_CLAUSE_OPENERS:
                bad.append(f"{feature}: {expected}")
    return bad


def generate(rows: int, seed: int = SEED) -> list[dict]:
    rng = random.Random(seed)

    bad = lint_clauses()
    if bad:
        raise SystemExit(
            "Expected-result clauses that will not read correctly once a context "
            "prefix is added (give them a determiner, or extend "
            "_VALID_CLAUSE_OPENERS if the opener is genuinely fine):\n  "
            + "\n  ".join(bad)
        )

    pairs = build_pairs()
    capacity = len(pairs) * len(CONTEXTS)
    if rows > capacity:
        raise SystemExit(
            f"Capacity is {len(pairs)} scenarios x {len(CONTEXTS)} contexts = "
            f"{capacity} distinct rows, but {rows} were requested. Add scenarios "
            f"to FEATURES or contexts to CONTEXTS — never repeat a pair."
        )

    # Build the full scenario x context grid, then shuffle it. Shuffling matters
    # for the demo: an unshuffled file would group all 16 contexts of one
    # scenario together, so the chunk viewer's first page would look like 16
    # duplicates and the ingest histogram would be misleading.
    grid = [(p, c) for p in pairs for c in CONTEXTS]
    rng.shuffle(grid)

    out: list[dict] = []
    modules_seen = sorted({m for m, *_ in pairs})

    for i, ((module, feature, component, action, expected, labels), ctx) in enumerate(grid[:rows]):
        # Context overrides the random pick where it specifies one; anything it
        # leaves open still varies so rows are not clones on the other axes.
        browser = ctx.get("browser", rng.choice(BROWSERS))
        device = ctx.get("device", rng.choice(DEVICES))
        plan = ctx.get("plan", rng.choice(PLANS))
        role = ctx.get("role", rng.choice(ROLES))
        env = ctx.get("env", rng.choice(ENVIRONMENTS))
        site = rng.choice(SITES)

        test_type = rng.choice(
            TEST_TYPES_NEGATIVE if _is_negative(expected) else TEST_TYPES_POSITIVE
        )

        tc_id = f"VWO-TC-{i + 1:05d}"
        all_labels = sorted(set(labels + [test_type.lower().replace(" ", "-"), ctx["slug"]]))

        out.append(
            {
                "Issue Type": "Test",
                "Issue Key": tc_id,
                "Summary": f"{_title(rng, module, feature, action, role)} [{ctx['slug']}]",
                "Description": (
                    "h3. Objective\n"
                    f"Verify that {_article(role)} {role} can {action} in the {module} module "
                    f"({feature}), {ctx['where']}.\n\n"
                    f"h3. Preconditions\n{_preconditions(rng, plan, role, site)}\n\n"
                    "h3. Test Data\n"
                    f"- Environment: {env}\n"
                    f"- Plan: {plan}\n"
                    f"- Role: {role}\n"
                    f"- Browser: {browser}\n"
                    f"- Device: {device}\n"
                    f"- Test site: {site}\n"
                ),
                "Test Steps": _steps(rng, module, feature, action, site, ctx),
                "Expected Result": f"{_sentence_case(ctx['where'])}, {expected}.",
                "Priority": rng.choice(PRIORITIES),
                "Component": component,
                "Module": module,
                "Feature": feature,
                "Test Type": test_type,
                "Labels": " ".join(all_labels),
                "Browser": browser,
                "Device": device,
                "Environment": env,
                "Automation Status": rng.choice(AUTOMATION),
                "Epic Link": f"VWO-EPIC-{modules_seen.index(module) + 1:02d}",
                "Reporter": "qa.automation",
                "Status": rng.choice(["To Do", "To Do", "In Progress", "Done"]),
            }
        )
    return out


FIELDNAMES = [
    "Issue Type",
    "Issue Key",
    "Summary",
    "Description",
    "Test Steps",
    "Expected Result",
    "Priority",
    "Component",
    "Module",
    "Feature",
    "Test Type",
    "Labels",
    "Browser",
    "Device",
    "Environment",
    "Automation Status",
    "Epic Link",
    "Reporter",
    "Status",
]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rows", type=int, default=TOTAL_DEFAULT)
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--out", default=str(Path(__file__).with_name("vwo_test_cases_5000.csv")))
    ap.add_argument(
        "--count-only",
        action="store_true",
        help="Report how many distinct scenarios are defined and exit.",
    )
    args = ap.parse_args()

    if args.count_only:
        pairs = build_pairs()
        print(f"features: {len(FEATURES)}")
        print(f"distinct (feature, action) scenarios: {len(pairs)}")
        return

    rows = generate(args.rows, args.seed)
    out = Path(args.out)

    # newline="" is required on Windows: without it csv emits \r\r\n and every
    # row gains a blank line, which breaks Jira's importer.
    with out.open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDNAMES, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)

    print(f"wrote {len(rows)} rows -> {out}")
    print(f"modules: {len({r['Module'] for r in rows})}")
    print(f"features: {len({r['Feature'] for r in rows})}")
    print(f"unique summaries: {len({r['Summary'] for r in rows})}")
    print(f"unique expected results: {len({r['Expected Result'] for r in rows})}")
    print(f"size: {out.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
