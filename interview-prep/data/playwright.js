// Playwright interview Q&A — sourced from Anand Soni's prep notes
// (1. Playwright INterview Questions 1 (All).txt, Ashok Questions.txt, Indium Playwright Interview Question.txt)
window.PLAYWRIGHT_DATA = {
  section: "Playwright",
  topics: [
    {
      topic: "Playwright Fundamentals",
      questions: [
        { q: "Why Playwright over Selenium?", a: "Playwright provides <b>auto-waiting</b>, built-in <b>parallel execution</b>, cross-browser testing, better handling of modern web apps, and faster execution compared to Selenium." },
        { q: "What browsers does Playwright support?", a: "Chromium, Firefox and WebKit (Safari) — using a single API." },
        { q: "How does Playwright handle waits?", a: "Playwright uses <b>auto-waiting</b> — it automatically waits for elements to be actionable before performing actions." },
        { q: "What is auto-waiting?", a: "Auto-waiting ensures Playwright waits for <b>visibility, stability and readiness</b> of elements before performing actions." },
        { q: "What are the main Playwright features/components?", a: "<b>1. Cross-Browser Support</b> — Chromium, Firefox, WebKit<br><b>2. Auto-Waiting</b> — no explicit waits needed in most cases<br><b>3. Built-in Test Runner</b> — parallel execution and retries<br><b>4. Headless &amp; Headed Mode</b><br><b>5. Parallel Execution</b> — by default, faster CI<br><b>6. Network Interception</b> — mock API responses<br><b>7. Trace Viewer &amp; Debugging</b> — screenshots, video, execution logs<br><b>8. Multiple Tabs &amp; Browser Contexts</b>" },
        { q: "What is Playwright Test Runner?", a: "A built-in test execution framework that supports parallel execution, retries, fixtures, reporting and cross-browser testing." },
        { q: "How do you install Playwright?", a: "<pre>npm init playwright@latest</pre>This installs Playwright, the browsers and a sample config." },
        { q: "What do these commands do?", a: "<pre>npm install              # install dependencies\nnpx playwright install   # install browsers\nnpx playwright test      # run tests</pre>" },
        { q: "Can we do API testing with Playwright?", a: "<b>Yes.</b> Playwright has built-in API testing capabilities via its request context." },
        { q: "Why did you move from Selenium to Playwright?", a: "Earlier projects used Selenium with Java and BDD because it was the industry standard, supported cross-browser and business teams liked feature files.<br><br>We moved to Playwright for: better auto-waiting · faster execution · built-in parallelism · network/API capabilities · more stability. Playwright reduced flakiness and maintenance." },
        { q: "Explain Playwright's architecture and how it communicates with browsers", a: "Playwright uses a <b>Node.js-based architecture</b> and communicates directly with browsers through <b>browser-specific protocols like CDP</b> (Chrome DevTools Protocol), enabling fast and reliable automation." }
      ]
    },
    {
      topic: "JavaScript / TypeScript Concepts",
      questions: [
        { q: "Why does Playwright use async/await?", a: "Playwright APIs are asynchronous and return Promises. async/await ensures proper execution order and avoids race conditions." },
        { q: "What happens if we don't use await?", a: "Without await, the promise is not resolved before the next step executes — leading to <b>flaky or failed tests</b>. The test fails because actions run before the previous async operation completes." },
        { q: "What is a Promise?", a: "A Promise represents the eventual <b>completion or failure</b> of an asynchronous operation." },
        { q: "Difference between Promise and async/await?", a: "Promises use <code>.then()</code> chaining, while async/await provides cleaner, more readable synchronous-like code — ensuring order of execution and avoiding race conditions." },
        { q: "Can we use await without async?", a: "<b>No.</b> await can only be used inside an async function; otherwise it throws a syntax error." },
        { q: "Major difference between async and await?", a: "<b>async</b> makes a function return a promise.<br><b>await</b> pauses execution until the promise is resolved." },
        { q: "What does Promise.all() do?", a: "Runs multiple promises <b>in parallel</b> and waits until all are resolved. If any one fails, the whole Promise.all fails.<pre>await Promise.all([\n  page.click('#submit'),\n  page.waitForNavigation()\n]);</pre>" },
        { q: "When is await required?", a: "When performing any action — click(), toBeChecked(), isChecked(), fill().<br><br><b>Placement rule:</b><pre>// action OUTSIDE the bracket\nawait expect(page.locator('#terms')).toBeChecked();\n\n// action INSIDE the bracket\nexpect(await page.locator('#terms').isChecked()).toBeTruthy();</pre>" },
        { q: "When should you NOT write await with locators?", a: "When you are <b>not performing any action</b> — e.g. just declaring a locator variable in a page object constructor." },
        { q: "What ES6 features do you use in Playwright?", a: "Arrow functions, destructuring, async/await, template literals, spread operator." },
        { q: "Difference between JavaScript and TypeScript?", a: "TypeScript is a <b>statically typed superset</b> of JavaScript that provides type safety and compiles to JavaScript. TS = JS + additional features; the code must be compiled to JS." },
        { q: "Why is TypeScript preferred in Playwright?", a: "TypeScript improves code quality through <b>type safety</b>, better IDE support and early error detection." },
        { q: "What is typing in TypeScript?", a: "Typing defines the data type of variables, function parameters and return values to prevent runtime errors.<pre>function login(user: string, pass: string): void {}</pre>" },
        { q: "Difference between let, var and const?", a: "<b>var</b> → function-scoped · reassign: Yes · redeclare: Yes (avoid)<br><b>let</b> → block-scoped · reassign: Yes · redeclare: No<br><b>const</b> → block-scoped · reassign: No · redeclare: No" },
        { q: "Can we execute TypeScript directly?", a: "Unlike JS, TS must be compiled to JS first — <code>tsc demo.ts</code> (tsc = TypeScript compile)." },
        { q: "How do you convert a String to a Number?", a: "Wrap it with <code>Number()</code> — e.g. <code>Number(monthNumber - 1)</code>" },
        { q: "How do you convert JSON to a JavaScript object?", a: "First to string, then parse:<pre>const dataset = JSON.parse(JSON.stringify(\n    require('../Utils/UserDetails.json')\n));</pre>" },
        { q: "What is the use of the this keyword?", a: "<code>this</code> refers to the current class object." }
      ]
    },
    {
      topic: "Locators",
      questions: [
        { q: "What types of locators does Playwright support?", a: "Role-based, text-based, label-based, test-id, CSS and XPath locators.<br><br>Full list: getByRole, getByLabel, getByPlaceholder, getByText, getByTestId, getByTitle, getByAltText, getByAttribute." },
        { q: "Locator priority order (INTERVIEW GOLD)", a: "1. <code>getByRole()</code><br>2. <code>getByLabel()</code><br>3. <code>getByPlaceholder()</code><br>4. <code>getByText()</code><br>5. <code>getByTestId()</code><br>6. CSS<br>7. XPath" },
        { q: "Which is the highest priority locator?", a: "Role-based locators like <code>getByRole()</code> — they are stable and accessibility-driven.<pre>page.getByRole('button', { name: 'Login' });</pre>" },
        { q: "Which is the least priority locator?", a: "<b>XPath</b> — it is fragile and breaks with UI changes." },
        { q: "Difference between locator() and $()?", a: "<code>locator()</code> supports <b>auto-waiting and retries</b>, whereas <code>$()</code> is a one-time element lookup." },
        { q: "When should you use page.locator()?", a: "When using a CSS value — then use the <code>page.locator()</code> method." },
        { q: "How do you handle dynamic elements?", a: "By using stable locators, Playwright auto-waiting, and assertions like <code>expect(locator).toBeVisible()</code> instead of hard waits." },
        { q: "How do you handle elements with dynamic IDs?", a: "Avoid IDs — use role, text or data-test-id based locators." },
        { q: "How do you handle flaky tests?", a: "By fixing locators, relying on auto-waits, avoiding <code>waitForTimeout</code>, and ensuring test data isolation. Retry mechanism can also be used." },
        { q: "Button appears after 3 seconds — what do you do?", a: "Nothing special — Playwright auto-waits. If needed, assert visibility using <code>expect()</code>." },
        { q: "How do you handle elements that appear after an API response?", a: "By waiting on the locator state or validating UI after the network response completes.<pre>await page.waitForResponse(response =&gt;\n  response.url().includes('/api/login') &amp;&amp;\n  response.status() === 200\n);</pre>" },
        { q: "If 2 elements match the same locator, how do you target a specific one?", a: "Using <code>.first()</code>, <code>.last()</code> or <code>.nth(index)</code>." },
        { q: "Multiple elements match but one is hidden — how do you click the visible one?", a: "<pre>page.locator(\"li a[href*='lifetime-access']:visible\").click();</pre>" },
        { q: "When should you use getByLabel to enter text?", a: "Only when there is an <b>association</b> between the label and the input — the <code>for</code> and <code>id</code> attributes must have the same value, or the input must be nested in the label tag. Mostly used for checkboxes and radio buttons.<br><br>If <code>for=\"password1\"</code> but <code>id=\"password2\"</code>, there is no association and getByLabel will not work." },
        { q: "How do you click a button using getByRole?", a: "<pre>await page.getByRole('button', { name: 'Submit' }).click();</pre>If there is only one button, the name can be omitted:<pre>await page.getByRole('button').click();</pre>" },
        { q: "Advanced filtering — add a specific product to cart", a: "<pre>await page\n  .locator('app-card')\n  .filter({ hasText: 'Blackberry' })\n  .getByRole('button', { name: 'Add to Cart' })\n  .click();</pre><b>Logic:</b> 1. Get all products with page.locator 2. Filter by product name with hasText 3. Locate the button with getByRole 4. Click." },
        { q: "Two elements have the same value (e.g. calendar) — how do you handle it?", a: "Use XPath instead of getByText:<pre>//abbr[text()=15]</pre>" },
        { q: "Advantage of getByPlaceholder over locator('#userEmail')?", a: "<code>getByPlaceholder</code> is more resilient to changes in the id attribute." }
      ]
    },
    {
      topic: "Actions & Element Handling",
      questions: [
        { q: "How do you write values in a text box?", a: "Using the <code>fill()</code> method." },
        { q: "How do you clear entered field values?", a: "Using <code>.fill(\"\")</code>" },
        { q: "How do you type slowly, letter by letter?", a: "Using <code>pressSequentially</code> with a delay:<pre>await page.locator(\"[placeholder*='Country']\")\n  .pressSequentially(\"ind\", { delay: 150 });</pre>Useful when the server response is slow while typing." },
        { q: "How do you get text content of single vs multiple elements?", a: "<code>textContent()</code> for a single element, <code>allTextContents()</code> for multiple." },
        { q: "How do you get the first element's text or use indexing?", a: "Using <code>.nth(0).textContent()</code> or <code>.first().textContent()</code>" },
        { q: "How do you verify a value exists in an array of elements?", a: "<pre>const allTitles = await page.locator('.card-title').allTextContents();\nexpect(allTitles).toContain(\"iphone X\");</pre>" },
        { q: "Difference between textContent() and inputValue()?", a: "<b>textContent()</b> returns the value of the element attached to the DOM.<br><b>inputValue()</b> returns the value filled inside a text box." },
        { q: "How do you select an option from a dropdown?", a: "<pre>const dropdown = page.locator(\"select.form-control\");\n\n// 1. By value\nawait dropdown.selectOption('consult');\n\n// 2. By visible text (label)\nawait dropdown.selectOption({ label: 'Consulting' });\n\n// 3. By index\nawait dropdown.selectOption({ index: 2 });</pre>Using getByLabel: <code>page.getByLabel(\"Gender\").selectOption(\"Male\");</code>" },
        { q: "Select a dropdown option by PARTIAL text match", a: "Iterate all options, match with includes(), then select and break:<pre>const valueToMatch = \"anand soni\";\nconst options = await page.locator(\"select option\").allTextContents();\n\nfor (let i = 0; i &lt; options.length; i++) {\n  let text = options[i];\n  if (text.toLowerCase().includes(valueToMatch.toLowerCase())) {\n    await page.selectOption(\"select\", { label: text });\n    break;\n  }\n}</pre>Handles cases like dropdown showing \"anandsoni - 1234\" when you only have \"anand soni\"." },
        { q: "How do you select a radio button?", a: "Using the <code>check()</code> method." },
        { q: "How do you validate a radio button is selected?", a: "<pre>// toBeChecked - assertion\nawait expect(page.locator('input[type=\"radio\"][value=\"male\"]'))\n  .toBeChecked();\n\n// isChecked - returns boolean\nconst isSelected = await page.locator('input[type=\"radio\"][value=\"male\"]')\n  .isChecked();\nexpect(isSelected).toBeTruthy();</pre>" },
        { q: "Difference between isChecked() and toBeChecked()?", a: "<b>isChecked()</b> returns a <b>boolean</b> — validated with toBeTruthy()/toBeFalsy(). await goes <b>inside</b> the bracket.<br><b>toBeChecked()</b> is an <b>assertion</b> with auto-waiting. await goes <b>outside</b> the bracket." },
        { q: "Validate the first or last of two radio buttons", a: "<pre>await expect(page.locator('.radiotextsty').first()).toBeChecked();\nawait expect(page.locator('.radiotextsty').last()).toBeChecked();</pre>" },
        { q: "How do you uncheck a checkbox / verify it is unchecked?", a: "Uncheck with <code>uncheck()</code>. Verify with:<pre>await expect(page.locator('#terms')).not.toBeChecked();</pre>" },
        { q: "How do you hover on an element?", a: "Using <code>locator.hover()</code>" },
        { q: "How do you validate an element is visible or hidden?", a: "<code>isVisible()</code> / <code>toBeVisible()</code> for visible; <code>isHidden()</code> / <code>toBeHidden()</code> for hidden.<pre>await expect(page.getByText(\"Zara Coat 3\")).toBeVisible();</pre>" },
        { q: "How do you find a locator by tag AND text?", a: "<pre>await expect(page.locator('h3:has-text(\"iphone 13 pro\")')).toBeVisible();</pre>" },
        { q: "How do you check if an element is blinking?", a: "<pre>expect(await page.locator('[href*=\"documents-request\"]'))\n  .toHaveAttribute('class', 'blinkingText');</pre>" },
        { q: "How do you get the count of products?", a: "<pre>const products = page.locator('.card-body');\nconst counts = await products.count();</pre>" },
        { q: "How do you get the page title?", a: "<pre>await expect(page).toHaveTitle('LoginPage Practise | Rahul Shetty Academy');</pre>" },
        { q: "How do you navigate forward or backward?", a: "<code>page.goBack()</code> or <code>page.goForward()</code>" },
        { q: "Why do we use expect() for validation?", a: "1. <b>Auto-waiting</b><br>2. Cleaner tests<br>3. Better failure messages" },
        { q: "Products list shows empty in console due to fast execution — how to fix?", a: "Wait for the element state before reading:<pre>await page.locator(\".card-body\").first()\n  .waitFor({ state: \"visible\" });\n\n// OR\nawait expect(page.locator(\".card-body\").first()).toBeVisible();</pre>" },
        { q: "Same text on two different pages — how do you distinguish?", a: "Differentiate using different tag names with the text, since the tag may be unique to each page." }
      ]
    },
    {
      topic: "Windows, Frames & Dialogs",
      questions: [
        { q: "How do you handle child windows / new tabs?", a: "<pre>const context = await browser.newContext();\nconst page = await context.newPage();\nawait page.goto('https://rahulshettyacademy.com/loginpagePractise/');\n\nconst documentlink = page.locator('[href*=\"documents-request\"]');\n\nconst [newPage] = await Promise.all([\n    context.waitForEvent('page'),\n    documentlink.click()   // opens a new tab\n]);\n\nconst text = await newPage.locator(\".red\").textContent();\nconsole.log(text);</pre><b>Key point:</b> <code>waitForEvent('page')</code> must be listening <b>before</b> the click." },
        { q: "How do you handle 2 or more child windows?", a: "<pre>const [newPage, newPage2] = await Promise.all([...]);</pre>Use <code>newPage2</code> to act on the second window." },
        { q: "On a new page but need to act on the main page — how?", a: "Use <code>newPage.locator()</code> for the new page and <code>page.locator()</code> for the main page — each has its own context reference." },
        { q: "How do you switch back to the parent window?", a: "Using <code>page.bringToFront()</code>" },
        { q: "What does browser.newContext() do?", a: "It creates a new browsing context for <b>isolated sessions</b> — separate cookies, cache and storage." },
        { q: "Difference between browser, context and page fixtures?", a: "<b>Browser</b> — a single browser instance (Chromium, Firefox, WebKit) launched by Playwright<br><b>Context</b> — an isolated browser session with its own cookies, cache and storage<br><b>Page</b> — a single tab or window within a browser context where test actions are performed" },
        { q: "How do you know a new page opened successfully?", a: "By waiting for <code>context.waitForEvent('page')</code> to trigger. After capturing it, validate its URL, title or load state to confirm." },
        { q: "How do you handle iFrames?", a: "Use <code>frameLocator()</code> instead of switching context manually:<pre>const frame = page.frameLocator('#login-iframe');\nawait frame.locator('#username').fill('user');\nawait frame.locator('#password').fill('pass');</pre>" },
        { q: "Difference between frame() and frameLocator()?", a: "<b>frame()</b> returns a Frame object.<br><b>frameLocator()</b> provides <b>auto-waiting and retry</b> support — more reliable." },
        { q: "How do you handle nested iframes?", a: "By chaining frameLocator() calls:<pre>page\n  .frameLocator('#parent-frame')\n  .frameLocator('#child-frame')\n  .locator('#submit')\n  .click();</pre>" },
        { q: "What is Shadow DOM and how does Playwright handle it?", a: "Shadow DOM encapsulates elements inside a component, preventing access via normal DOM selectors.<br><br>Playwright <b>pierces open Shadow DOM automatically</b>:<pre>await page.locator('my-component &gt;&gt; text=Submit').click();</pre><b>Closed Shadow DOM cannot be accessed</b> unless developers expose test hooks." },
        { q: "How do you handle file uploads and downloads?", a: "<b>Upload</b> — <code>setInputFiles()</code> with the locator and file path:<pre>await page.setInputFiles('#uploadFile', 'tests/data/sample.pdf');</pre><b>Download</b> — <code>page.waitForEvent('download')</code> to capture and validate:<pre>const download = await Promise.all([\n  page.waitForEvent('download'),\n  page.click('#downloadBtn')\n]);\n\nawait download[0].saveAs('downloads/report.pdf');</pre>" },
        { q: "How do you handle JavaScript popups (non-web dialogs)?", a: "<pre>page.on('dialog', dialog =&gt; dialog.accept());  // or dialog.dismiss()\nawait page.locator(\"#confirmbtn\").click();</pre>The listener must be set up <b>before</b> the click — the dialog pauses browser execution until accepted or dismissed. Without a listener you get:<br><i>\"Unhandled dialog. Please use page.on('dialog', ...) to handle it.\"</i>" }
      ]
    },
    {
      topic: "Parallel Execution & Workers",
      questions: [
        { q: "Does Playwright support parallel execution?", a: "<b>Yes</b> — out of the box using worker processes. By default it runs test <b>files</b> in parallel using available CPU cores." },
        { q: "What are workers in Playwright?", a: "Workers define the <b>maximum number of parallel worker processes</b> used to execute tests.<pre>workers: 4</pre>" },
        { q: "Difference between default parallelism and workers?", a: "Default parallelism <b>enables</b> parallel execution; workers <b>control how many</b> tests can run in parallel." },
        { q: "Why did tests run with only 1 worker even when workers = 2?", a: "Because tests inside the <b>same file run sequentially</b> unless wrapped in <code>test.describe.parallel</code>." },
        { q: "How do you run tests inside the same file in parallel?", a: "<pre>test.describe.parallel('parallel block', () =&gt; {\n  test('test 1', async () =&gt; {});\n  test('test 2', async () =&gt; {});\n});</pre>Or configure the mode before the first test:<pre>test.describe.configure({ mode: 'parallel' });</pre>" },
        { q: "What happens if workers: 1 is set?", a: "All tests run <b>sequentially</b> — parallel execution is disabled." },
        { q: "Config workers vs CLI workers — what is the difference?", a: "<pre>npx playwright test --config=playwright1.config.js --project=chrome</pre>→ uses the workers set in config.js<pre>npx playwright test --config=playwright1.config.js --project=chrome --workers=1</pre>→ CLI value overrides at runtime" },
        { q: "Difference between parallel and serial mode?", a: "<b>Parallel</b> — 2 tests run simultaneously with 2 workers, even if workers is not defined in config.<br><b>Serial</b> — tests run one after another. <b>If the 1st test fails, the remaining ones are skipped.</b><pre>test.describe.configure({ mode: 'serial' });</pre>" },
        { q: "How does Playwright maintain isolation in parallel runs?", a: "Each test runs in a <b>separate browser context</b>, ensuring isolation even in parallel execution." },
        { q: "Can parallel tests share data?", a: "<b>No</b> — shared data causes flaky tests. Each test should have independent test data." },
        { q: "How do you scale Playwright execution in CI?", a: "By increasing workers, using parallel projects, and distributing tests across CI agents using <b>sharding</b>." }
      ]
    },
    {
      topic: "Network Interception & Auth",
      questions: [
        { q: "What is network interception?", a: "It allows us to <b>mock, modify or validate</b> API requests and responses using <code>page.route()</code> for stable and isolated UI tests." },
        { q: "Why do we mock APIs in UI automation?", a: "To isolate UI tests from backend instability, improve reliability and control test data. In CI it also makes tests faster and independent of backend availability." },
        { q: "How do you mock an API response?", a: "<pre>await page.route('**/api/users', route =&gt;\n  route.fulfill({\n    status: 200,\n    body: JSON.stringify({ name: 'Test User' })\n  })\n);</pre>" },
        { q: "Difference between route and waitForResponse?", a: "<b>route</b> is used to <b>mock or modify</b> requests.<br><b>waitForResponse</b> is used to <b>wait and validate</b> API responses." },
        { q: "How do you wait for a specific API call?", a: "<pre>await page.waitForResponse(response =&gt;\n  response.url().includes('/login') &amp;&amp;\n  response.status() === 200\n);</pre>" },
        { q: "Can Playwright block network calls?", a: "Yes — using <code>route.abort()</code> to block unnecessary resources." },
        { q: "How do you handle authentication?", a: "By reusing authenticated state using <b>storageState</b> instead of logging in for every test.<pre>await page.context().storageState({ path: 'auth.json' });</pre>Then in config:<pre>use: {\n  storageState: 'auth.json'\n}</pre>" },
        { q: "How do you automate MFA or OAuth login?", a: "We avoid automating the MFA UI directly — instead we use <b>API-based authentication</b> or pre-authenticated storage state." },
        { q: "Login UI works but the backend is unstable — what do you do?", a: "Mock the authentication API or reuse stored authentication state." }
      ]
    },
    {
      topic: "Debugging, Screenshots & Traces",
      questions: [
        { q: "How do you debug a script?", a: "Using the <b>Playwright Inspector</b>:<pre>npx playwright test tests/Windowhandle.spec.ts --debug</pre>" },
        { q: "What is Playwright Inspector used for?", a: "· Debugging scripts<br>· Finding locators (explore option)<br>· Identifying locators mid-execution<br>· Generating code via codegen<br>· Helping with validation" },
        { q: "How do you pause execution?", a: "<code>await page.pause();</code> — opens the Playwright Inspector to inspect browser state manually during test execution." },
        { q: "How do you use the codegen tool?", a: "<pre>npx playwright codegen https://www.google.com</pre>Perform actions in the browser and it generates code from them." },
        { q: "How do you run in UI mode?", a: "<pre>npx playwright test --ui</pre>" },
        { q: "How do you take a screenshot?", a: "<pre>// full page\nawait page.screenshot({ path: 'screenshot.png', fullPage: true });\n\n// partial / by locator\nawait page.locator(\"#displayed-text\")\n  .screenshot({ path: 'visibletext.png' });</pre>Or globally in config: <code>screenshot: 'only-on-failure'</code>" },
        { q: "Where are screenshots saved?", a: "Under <code>test-results/</code>" },
        { q: "How do you set traces only for failures?", a: "<code>trace: 'retain-on-failure'</code><br><br><b>on</b> → traces for all tests · <b>off</b> → no traces. Since trace logs are heavy, retain-on-failure is preferred." },
        { q: "Where do you find traces for a specific test?", a: "Under <code>test-results/</code> in the folder for that test case — screenshots named test-finished/test-failure, and traces as a <b>zip file</b>. Open the zip at <b>trace.playwright.dev</b>." },
        { q: "How do you set video capture?", a: "<code>video: 'retain-on-failure'</code>" },
        { q: "How do you handle failures in CI?", a: "By analyzing logs, screenshots, videos and traces generated by Playwright." }
      ]
    },
    {
      topic: "Configuration & Commands",
      questions: [
        { q: "What can you set in the config file?", a: "Screenshot, traces, browserName, headless, baseURL, timeouts, retries, workers, projects, viewport, permissions, reporters." },
        { q: "How do you set up global configuration?", a: "<pre>use: {\n  baseURL: process.env.BASE_URL,\n  browserName: 'chromium',\n  headless: true,\n  screenshot: 'on',\n  trace: 'retain-on-failure'\n}</pre>" },
        { q: "Essential Playwright commands", a: "<pre>npx playwright test                      # run all\nnpx playwright test --headed             # headed mode\nnpx playwright test login.spec.ts        # specific file\nnpx playwright test --debug              # debug mode\nnpx playwright test --ui                 # UI mode\nnpx playwright show-report               # HTML report</pre>" },
        { q: "How do you run a specific test?", a: "Using <code>test.only</code>" },
        { q: "How do you skip a test?", a: "Using <code>test.skip</code>" },
        { q: "How do you run tests by tag (grouping)?", a: "Tag the test name then use --grep:<pre>test('@Web Client App login', async ({ page }) =&gt; {});</pre><pre>npx playwright test --grep \"@Web\"</pre>" },
        { q: "How do you run a specific config file?", a: "<pre>npx playwright test tests/ClientAppPo.spec.js --config playwright.config1.js</pre>" },
        { q: "How do you run in a specific browser without a new config?", a: "<pre># if projects are defined in config\nnpx playwright test spec.js --config playwright1.config.js --project=webkitprofile\n\n# otherwise\nnpx playwright test spec.js --config playwright1.config.js --browser=webkit</pre>If no project is specified and multiple browsers are configured, it runs in <b>all</b> of them." },
        { q: "How do you customize npm scripts?", a: "In package.json:<pre>\"scripts\": {\n  \"test\": \"npx playwright test\",\n  \"webtest\": \"npx playwright test --grep @Web\"\n}</pre>Run with: <code>npm run webtest</code>" },
        { q: "How do you run tests on a mobile device?", a: "In config: <code>...devices['iPhone 11']</code>" },
        { q: "How do you set window size?", a: "Set <code>viewportSize</code> in the config file." },
        { q: "How do you ignore SSL certificate errors?", a: "<code>ignoreHTTPSErrors: true</code>" },
        { q: "How do you allow location permissions?", a: "<code>permissions: ['geolocation']</code>" },
        { q: "How do you set retries?", a: "<code>retries: 1</code> — applies to all project test files. Useful so <code>video: 'on-first-retry'</code> can capture the retry." },
        { q: "What is the default timeout for a test?", a: "<b>30 seconds.</b> The assertion timeout can be set separately in the config file." },
        { q: "How do you manage different environments?", a: "Using environment variables and Playwright config files:<pre>use: {\n  baseURL: process.env.BASE_URL\n}</pre>" },
        { q: "Explain Test Config", a: "Playwright config defines <b>global settings</b> — browser, timeouts, reporters, screenshots, traces, videos and environment configuration — centrally, for consistent execution." },
        { q: "Explain Test Hooks", a: "Playwright provides <code>beforeAll</code>, <code>beforeEach</code>, <code>afterEach</code> and <code>afterAll</code> to manage setup and teardown." }
      ]
    },
    {
      topic: "Page Object Model & Fixtures",
      questions: [
        { q: "What goes in the Page Object constructor?", a: "1. Store page reference → <code>this.page = page</code><br>2. Initialize <b>locators only</b><br>3. <b>No test logic</b> — no fill or click<pre>this.username = page.locator('#username');</pre>Actions go inside the methods." },
        { q: "Is async required in Page Object methods?", a: "<b>Yes</b> — otherwise JavaScript throws \"await is only valid in async functions\".<pre>async validLogin(useremail, password) {\n    await this.useremail.fill(useremail);\n    await this.userpassword.fill(password);\n    await this.loginbutton.click();\n}</pre>" },
        { q: "Do all Page Object method calls need await?", a: "<b>Yes</b> — otherwise the test becomes flaky." },
        { q: "What is module.exports?", a: "Used in the Page Object class to export it:<pre>module.exports = { LoginPage };</pre>It must then be imported at the top of the test class to reuse those methods." },
        { q: "What are fixtures?", a: "<b>Default fixtures</b> — browser, page, context — automatically set up for tests.<br><b>Custom fixtures</b> — created by extending the base to define specific state or data.<br><br><b>Purpose:</b> set up and tear down the test environment, providing resources like a page or authentication, ensuring consistency across test cases." },
        { q: "How do you create a custom fixture?", a: "In a new utils file:<pre>const { base } = require('@playwright/test');\n\nexports.testBase = base.extend({\n    testDataForOrder: {\n        username: \"anandsoni26@test.com\",\n        password: \"Anand@123\",\n        productName: \"ADIDAS ORIGINAL\"\n    }\n});</pre>In the test file:<pre>test(\"Client app login\", async ({ page, testDataForOrder }) =&gt; {});</pre>" },
        { q: "Explain the Playwright framework you designed", a: "· <b>config.js</b> — browser, screenshot, traces, headless, test runner setup<br>· <b>package.json</b> — custom scripts<br>· <b>utilities</b> — JSON file for parameterization<br>· <b>Jenkins</b> for CI/CD<br>· <b>Allure and Ortoni</b> reporting<br>· <b>test</b> folder<br>· <b>page object</b> folder with constructor and method details<br>· parallel testing<br>· <b>fixtures</b> — browser, context, page" }
      ]
    },
    {
      topic: "Data Driven Testing",
      questions: [
        { q: "How do you drive test data from external JSON files?", a: "Create a JSON file with the required values, then import and use it in the test file. Custom fixtures can also pass the data." },
        { q: "How do you parameterize tests with multiple data sets?", a: "1. Create an array of data sets in a JSON file<br>2. Loop with <code>for (const data of dataset)</code><br>3. Make the test name <b>dynamic</b> — duplicate test names throw an error<pre>for (const data of dataset) {\n    test(`Client App login for ${data.productName}`,\n      async ({ page }) =&gt; {\n        // test steps\n    });\n}</pre>" },
        { q: "Example JSON data set", a: "<pre>[\n  {\n    \"useremail\": \"johdoe@test.com\",\n    \"password\": \"Password123!\",\n    \"productName\": \"Zara Coat 3\"\n  },\n  {\n    \"useremail\": \"manan@test.com\",\n    \"password\": \"Test@123\",\n    \"productName\": \"ADIDAS ORIGINAL\"\n  }\n]</pre>" },
        { q: "How do you work with Excel in Playwright?", a: "Install ExcelJS: <code>npm install exceljs</code>" },
        { q: "How do you read data from Excel?", a: "<pre>const ExcelJS = require('exceljs');\n\nasync function excelTest() {\n    const workbook = new ExcelJS.Workbook();\n    await workbook.xlsx.readFile(\"excelDownloadTest.xlsx\");\n    const worksheet = workbook.getWorksheet('Sheet1');\n    worksheet.eachRow((row, rowNumber) =&gt; {\n        row.eachCell((cell, colNumber) =&gt; {\n            console.log(cell.value);\n        });\n    });\n}\nexcelTest();</pre>" },
        { q: "How do you replace a value in an Excel file?", a: "Read to find the cell, then write:<pre>worksheet.eachRow((row, rowNumber) =&gt; {\n    row.eachCell((cell, colNumber) =&gt; {\n        if (cell.value === \"Apple\") {\n            console.log(rowNumber, colNumber);\n        }\n    });\n});\n\nconst cell = worksheet.getCell(3, 2);\ncell.value = \"Iphone\";\nworkbook.xlsx.writeFile(\"excelDownloadTest.xlsx\");</pre>" }
      ]
    },
    {
      topic: "Visual Testing & Reporting",
      questions: [
        { q: "How do you do visual testing?", a: "Image comparison with <code>toMatchSnapshot()</code>:<pre>expect(await page.screenshot()).toMatchSnapshot(\"homepage.png\");</pre>" },
        { q: "What happens on the first snapshot run?", a: "It <b>fails initially</b> — no baseline exists. On retry it takes a fresh screenshot and matches against it." },
        { q: "What reports does Playwright provide?", a: "Built-in <b>HTML reports</b>, and integration with <b>Allure</b> or <b>Ortoni</b> for advanced reporting." },
        { q: "How do you generate and view the HTML report?", a: "<pre>npx playwright test\nnpx playwright show-report</pre>Report is at <code>playwright-report/index.html</code>." },
        { q: "How do you set up Allure reporting?", a: "<pre>npm install -D allure-playwright\nnpm install -g allure-commandline --save-dev\n\nnpx playwright test --reporter=line,allure-playwright\n\nallure open allure-report</pre>Download the Allure report and add the bin path to the PATH environment variable." },
        { q: "How do you integrate Allure in CI?", a: "By generating <code>allure-results</code> during execution and publishing Allure reports as pipeline artifacts." }
      ]
    },
    {
      topic: "Cucumber BDD with Playwright",
      questions: [
        { q: "What is a World Constructor?", a: "Used in Cucumber — e.g. <code>this.loginPage</code>, <code>this.dashboardPage</code> — to share state and give knowledge to all the steps using it." },
        { q: "How do you parameterize in Cucumber?", a: "Using <b>Scenario Outline</b> with the Examples keyword." },
        { q: "How do you run parallel tests in Cucumber?", a: "Cucumber can run <b>scenarios</b> in parallel but <b>not feature files</b>.<pre>npx cucumber-js features/EcommerceValidations.feature --parallel 2</pre>(2 = how many scenarios run in parallel)" },
        { q: "How do you generate an HTML report in Cucumber?", a: "<pre>npx cucumber-js features/Ecommerce.feature --parallel 2 --format html:cucumber-report.html</pre>" },
        { q: "How do you retry a failed test in Cucumber?", a: "<pre>npx cucumber-js --tags \"@Validations\" --retry 1 --format html:cucumber-report.html</pre>" },
        { q: "What are tagged hooks?", a: "Hooks mapped to specific tags so they run only for those tests:<pre>Before({ tags: \"@Regression\" }, function() { ... });\nBefore({ tags: \"@Regression and @Validations\" }, ...);\nBefore({ tags: \"@Regression or @Validations\" }, ...);</pre>" },
        { q: "Can we add 2 tags to a scenario?", a: "<b>Yes</b> — e.g. @Validations and @Regression on the same scenario." },
        { q: "What is BeforeStep and AfterStep?", a: "<b>BeforeStep</b> runs before every step in a scenario.<br><b>AfterStep</b> captures the result status — if failed, we capture a screenshot: <code>await this.page.screenshot();</code>" },
        { q: "Difference between BeforeAll and Before?", a: "<b>BeforeAll</b> runs only <b>once</b> before any scenario.<br><b>Before</b> runs before <b>each</b> scenario." },
        { q: "How do you exit the terminal after execution?", a: "<code>npx cucumber-js --exit</code>" },
        { q: "How do you disable the publish message?", a: "Create a cucumber.js file:<pre>module.exports = { default: '--publish-quiet' }</pre>" }
      ]
    },
    {
      topic: "CI/CD, Git & Challenges",
      questions: [
        { q: "What Git commands do you commonly use?", a: "git clone · git pull · git checkout -b · git add · git commit · git push · git merge" },
        { q: "What challenges have you faced in Playwright?", a: "Handling dynamic elements · dealing with frames · debugging on failure.<br><br><b>How resolved:</b> stable locators, Playwright auto-waiting, frameLocator for iframes, and traces/screenshots for debugging." },
        { q: "What exceptions have you faced in Playwright?", a: "<b>TimeoutError</b> · element not found due to incorrect locators · navigation timeout errors · network-related failures when API responses are delayed or blocked." },
        { q: "How do you write robust tests / handle dynamic elements?", a: "By using stable locators, Playwright auto-waiting, proper assertions, isolated test data, and avoiding hard waits to reduce flakiness." },
        { q: "How do you wait until the page is loaded and an element is actionable?", a: "Playwright waits automatically. For validation use assertions like <code>expect(locator).toBeVisible()</code> or <code>toBeEnabled()</code>." },
        { q: "How do you do dynamic wait in Playwright?", a: "Playwright has auto-waiting with a default timeout of <b>30 seconds</b>. For assertions we can set a custom timeout as required." },
        { q: "Write an XPath to get image captions on Amazon", a: "<pre>//img[@class='s-image']/following::span[1]</pre>More stable:<pre>//div[@data-component-type='s-search-result']//h2//span</pre><b>Approach:</b> inspect a stable parent, avoid index, create a relative XPath." }
      ]
    }
  ]
};
