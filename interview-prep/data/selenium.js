// Selenium interview Q&A — sourced from Anand Soni's prep notes (Question-1..7.txt)
window.SELENIUM_DATA = {
  section: "Selenium",
  topics: [
    {
      topic: "Selenium Basics",
      questions: [
        { q: "What is Selenium?", a: "Selenium is a robust test automation suite used for automating web-based applications. It supports multiple browsers, operating systems and platforms." },
        { q: "What are the different forms of Selenium?", a: "Selenium WebDriver, Selenium IDE, Selenium RC and Selenium Grid." },
        { q: "What is Selenium WebDriver?", a: "A web framework that permits cross-browser test execution. Used for automating web-based application testing to verify it performs as expected." },
        { q: "What is WebDriver?", a: "WebDriver is an <b>interface</b>." },
        { q: "What is ChromeDriver?", a: "It is a constructor — used to start and stop execution for the Chrome browser." },
        { q: "What is the root interface in Selenium?", a: "<b>SearchContext</b>." },
        { q: "Advantages of Selenium", a: "Open source tool · Takes less time vs manual effort · Code is reusable · Works across multiple platforms and programming languages · Minimal human intervention." },
        { q: "Limitations of Selenium", a: "Does not work for desktop applications · Requires coding knowledge · No proper tech support · No built-in reporting — needs 3rd-party libs like TestNG and Extent Reports." },
        { q: "Which browsers/drivers does Selenium support?", a: "Chrome, Firefox, Opera, Internet Explorer, Safari." },
        { q: "Can we test APIs or web services using Selenium WebDriver?", a: "Yes." },
        { q: "Explain: WebDriver driver = new ChromeDriver()", a: "<b>WebDriver</b> is an interface · <b>driver</b> is a reference variable · <b>new</b> is a keyword to create an object · <b>ChromeDriver</b> is a constructor. This statement launches the Chrome browser." },
        { q: "Why WebDriver driver = new ChromeDriver() and not ChromeDriver driver = new ChromeDriver()?", a: "Using the WebDriver reference allows <b>runtime polymorphism</b> and makes the framework browser-independent. We can switch browsers easily and we follow abstraction — an OOP principle that makes the framework scalable and flexible." }
      ]
    },
    {
      topic: "Locators & XPath",
      questions: [
        { q: "What are the different locators in Selenium?", a: "id, xpath, css, name, className, linkText, partialLinkText, tagName." },
        { q: "What is XPath?", a: "XPath (eXtensible Path) is a technique in Selenium to navigate through the HTML structure of a page. It works on the basis of the DOM structure — it navigates to the path and verifies the tag, attribute and values present for that element." },
        { q: "What is DOM?", a: "Document Object Model. When we browse a page, the browser converts the HTML code into a DOM structure, which is used to interact with web elements." },
        { q: "What is absolute XPath?", a: "Locates an element using an XML expression starting from the root node. Starts with a single slash <code>/</code>. Example: <code>/html/body/div</code>" },
        { q: "What is relative XPath?", a: "Locates an element from anywhere in the DOM, directly identifying the child or grandchild element. Starts with double slash <code>//</code>. Example: <code>//input[@class='username']</code>" },
        { q: "Which XPath do you prefer and why?", a: "<b>Relative XPath.</b> With absolute XPath, if the developer changes any attribute in the HTML there is a high chance the script will fail during execution. Relative XPath is more stable." },
        { q: "What are XPath axes?", a: "Axes help traverse to other elements when elements do not have unique IDs — following-sibling, preceding-sibling, parent, child, ancestor, descendant." },
        { q: "How to locate an element by partially matching its attribute value?", a: "Using the <code>contains()</code> method.<br><code>//*[contains(@name, 'user')]</code>" },
        { q: "How to locate elements using their text in XPath?", a: "Using the <code>text()</code> method.<br><code>//*[text()='username']</code>" },
        { q: "How to move to the nth child element using XPath?", a: "Two ways:<br>1. Square brackets with index — <code>div[2]</code><br>2. position() method — <code>div[position()=3]</code>" },
        { q: "CSS selector syntax — by class?", a: "<code>.className</code> — e.g. <code>.inputtext</code>" },
        { q: "CSS selector syntax — by id?", a: "<code>#idValue</code> — e.g. <code>#u_0_n</code>" },
        { q: "CSS selector — select by attribute value?", a: "Using <code>[attribute=value]</code>" },
        { q: "Fundamental difference between XPath and CSS selector?", a: "In XPath we can traverse from parent to child <b>and</b> child to parent. In CSS we can only traverse parent to child, not child to parent." },
        { q: "Difference between linkText and partialLinkText?", a: "linkText requires the complete value; partialLinkText needs only a portion.<br><code>driver.findElement(By.linkText(\"Click here to Login\"));</code><br><code>driver.findElement(By.partialLinkText(\"Login\"));</code>" },
        { q: "A button id changes from 'start' to 'stop' on click — how do you handle it?", a: "Use contains() on the common portion, or an OR condition:<br><code>//button[contains(@id,'st')]</code><br><code>//button[@id='start' or @id='stop']</code>" },
        { q: "How to inspect web element attributes?", a: "Using the SelectorsHub tool or browser Developer Tools." },
        { q: "Difference between findElement and findElements?", a: "<b>findElement</b> returns a single element and throws <code>NoSuchElementException</code> if not found.<br><b>findElements</b> returns a list of elements and does not throw an exception — it returns an empty list (size = 0)." },
        { q: "Difference between getText() and getAttribute()?", a: "getText() returns the inner text of the element; getAttribute() captures the value of any attribute." }
      ]
    },
    {
      topic: "Waits & Synchronization",
      questions: [
        { q: "What wait statements have you used and why?", a: "Implicit, Explicit and Fluent wait. Before performing an action we must ensure the page is loaded and the element is visible — waits exist for <b>synchronization</b>." },
        { q: "Implicit vs Explicit wait", a: "<b>Implicit</b> — global wait, applied throughout the class, used once, does not find performance issues.<br><code>driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));</code><br><br><b>Explicit</b> — not global, used for specific scenarios, can be used multiple times, helps find performance-related issues.<br><code>WebDriverWait wait = new WebDriverWait(driver, 10);</code>" },
        { q: "What are the expected conditions in explicit wait?", a: "visibilityOfElementLocated, invisibilityOfElementLocated, presenceOfElementLocated, elementToBeClickable." },
        { q: "Which exception does implicit vs explicit wait throw?", a: "Implicit wait → <code>NoSuchElementException</code><br>Explicit wait → <code>TimeoutException</code>" },
        { q: "If implicit wait is 5s and the page loads in 2s, does it wait the remaining 3s?", a: "<b>No.</b> Once the page has loaded, WebDriver commands proceed immediately. The same applies to explicit wait." }
      ]
    },
    {
      topic: "Browser & Element Handling",
      questions: [
        { q: "Difference between get() and navigate().to()?", a: "<code>get()</code> navigates to a URL and waits for the page to load.<br><code>navigate().to()</code> also navigates but additionally provides <code>forward()</code>, <code>back()</code> and <code>refresh()</code> methods." },
        { q: "How to handle multiple windows?", a: "Using the <code>getWindowHandles()</code> method." },
        { q: "Difference between getWindowHandle() and getWindowHandles()?", a: "<b>getWindowHandle()</b> — single window, returns session id of the parent window, return type <code>String</code>.<br><b>getWindowHandles()</b> — all open windows, returns session ids of all windows, return type <code>Set&lt;String&gt;</code>." },
        { q: "How to navigate to the last tab?", a: "<pre>Set&lt;String&gt; tabs = driver.getWindowHandles();\nList&lt;String&gt; tabList = new ArrayList&lt;&gt;(tabs);\ndriver.switchTo().window(tabList.get(tabList.size() - 1));</pre>" },
        { q: "In how many ways can we switch to a frame?", a: "Three — by <b>Index</b>, by <b>WebElement</b>, by <b>Name or ID</b>." },
        { q: "How to handle an alert?", a: "<code>driver.switchTo().alert()</code> then use <code>accept()</code>, <code>dismiss()</code>, <code>getText()</code>, <code>sendKeys()</code>." },
        { q: "How to find the number of options in a dropdown?", a: "<pre>WebElement dropdown = driver.findElement(By.id(\"locator\"));\nSelect s = new Select(dropdown);\nint options = s.getOptions().size();\nSystem.out.println(options);</pre>Without the Select class, use a List&lt;WebElement&gt; and the size() method." },
        { q: "How to select from a dropdown if the select tag is not present?", a: "1. Get all options as List&lt;WebElement&gt;<br>2. Iterate with a for loop<br>3. Match using equalsIgnoreCase()<br>4. Click and break<pre>List&lt;WebElement&gt; options = driver.findElements(By.xpath(\"//ul[@class='dropdown']/li\"));\nfor (WebElement option : options) {\n    if (option.getText().equalsIgnoreCase(\"desiredValue\")) {\n        option.click();\n        break;\n    }\n}</pre>" },
        { q: "How to handle dynamic web tables?", a: "Identify the table structure using table, tr, td tags. Capture all rows with findElements, iterate and apply conditions to find required data. For example, search a username in one column and click the corresponding action button in another. If pagination exists, navigate page by page until data is found." },
        { q: "How to handle broken links?", a: "Find all elements with tagName <code>a</code> via findElements, loop through them, get the href with getAttribute, send an HTTP request to that URL, and read the response code. If the response is <b>&gt;= 400</b>, mark it as a broken link." },
        { q: "How to check if a logo is displayed?", a: "Using the <code>isDisplayed()</code> method." },
        { q: "How to find the total number of links on a page?", a: "Create a List&lt;WebElement&gt; using tagName <code>a</code>, then use the size() method to get the count." },
        { q: "There are 7 checkboxes — select the last 3", a: "<pre>List&lt;WebElement&gt; checkboxes = driver.findElements(By.xpath(\"//input[@type='checkbox']\"));\nint startIndex = checkboxes.size() - 3;\nfor (int i = startIndex; i &lt; checkboxes.size(); i++) {\n    WebElement checkbox = checkboxes.get(i);\n    if (!checkbox.isSelected()) checkbox.click();\n}</pre>" },
        { q: "How to verify a tooltip that changes every time?", a: "1. Use Actions class to move to the element<br>2. Locate the tooltip using role='tooltip'<br>3. Get text with getText()<br>4. Assert it is not empty or contains an expected keyword<pre>assertFalse(tooltipText.isEmpty());\nassertTrue(tooltipText.contains(\"ExpectedKeyword\"));</pre>" },
        { q: "How to check if the WebDriver is initialized?", a: "<pre>RemoteWebDriver r = (RemoteWebDriver) driver;\nSystem.out.println(r.getSessionId());</pre>" },
        { q: "What happens in Selenium when you click an element?", a: "Selenium communicates with the browser driver (e.g. ChromeDriver). The driver checks if the element is present, visible and interactable, calculates its position in the DOM and performs the click through browser automation commands. If hidden or overlapped, it throws <code>ElementNotInteractableException</code> or <code>ElementClickInterceptedException</code>." },
        { q: "Element is visible but not clickable — how do you handle it?", a: "Common causes: stale element issue, a loader still present, or a JavaScript overlay. Handle with waits, re-locating the element, or a JavaScript executor click." }
      ]
    },
    {
      topic: "Actions & JavaScript Executor",
      questions: [
        { q: "How do you perform mouse operations?", a: "Using the <b>Actions</b> class — contextClick, doubleClick, dragAndDrop, moveToElement." },
        { q: "Is Actions a class or interface?", a: "<b>Actions</b> is a class · <b>Action</b> is an interface." },
        { q: "What are build() and perform()? What if perform() is not used?", a: "build() creates/compiles the action, perform() executes it. Without perform(), <b>no action is executed</b>." },
        { q: "How to define an action now but execute it later?", a: "<pre>Actions a = new Actions(driver);\nAction action = a.moveToElement(element).build();\n// later\naction.perform();</pre>" },
        { q: "How to type in upper case using Actions class?", a: "<pre>Actions actions = new Actions(driver);\nactions.keyDown(Keys.SHIFT)\n       .sendKeys(\"anand\")\n       .keyUp(Keys.SHIFT)\n       .perform();</pre>Alternatively use toUpperCase() / toLowerCase()." },
        { q: "What is JavaScript Executor used for?", a: "Scrolling, drag and drop, performing actions on disabled/hidden elements, retrieving attributes and text, clicking buttons, sendKeys." },
        { q: "Is JavaScriptExecutor a class or interface?", a: "It is an <b>interface</b>." },
        { q: "Write code to click and sendKeys with JavaScript Executor", a: "<pre>JavascriptExecutor js = (JavascriptExecutor) driver;\njs.executeScript(\"arguments[0].click();\", element);\n\njs.executeScript(\"arguments[0].value='AnandSoni';\", element);</pre>" },
        { q: "How to capture a screenshot on failure?", a: "<pre>File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);\nFileUtils.copyFile(src, new File(\"C://test.png\"));</pre>" }
      ]
    },
    {
      topic: "Exceptions",
      questions: [
        { q: "Which exceptions have you faced in Selenium?", a: "NoSuchElementException, NoSuchWindowException, SessionNotFoundException, StaleElementReferenceException, NoSuchFrameException, ElementNotInteractableException, NoAlertPresentException, TimeoutException." },
        { q: "What is StaleElementReferenceException and how do you handle it?", a: "When a previously located element is no longer attached to the DOM — due to frequent AJAX calls or page refresh. Handle it by re-locating the element, sometimes refreshing the page, and using try-catch or retry logic." },
        { q: "When do you see ElementClickIntercepted exception?", a: "When the application is in a changing state — an overlay, loader or another element is intercepting the click." },
        { q: "What are checked and unchecked exceptions?", a: "<b>Checked</b> — IOException, SQLException, FileNotFoundException.<br><b>Unchecked</b> — NullPointerException, ArrayIndexOutOfBoundsException, ArithmeticException." },
        { q: "Difference between throw and throws?", a: "<b>throw</b> — throws an exception, used in the method body, followed by an instance, one exception at a time.<br><b>throws</b> — declares an exception, used in the method signature, followed by a class, can declare multiple exceptions." }
      ]
    },
    {
      topic: "TestNG",
      questions: [
        { q: "What are the main features of TestNG?", a: "Include/exclude mechanism · Parallel execution of classes or methods · Priority · Skip tests with enabled=false · DataProvider for parameterization · timeout per test · Grouping · dependsOnMethods · invocationCount · Reporting · Regular expressions for method naming." },
        { q: "Hard assert vs soft assert", a: "<b>Hard assert</b> — if validation fails, further script does not execute.<br><b>Soft assert</b> — execution continues even if validation fails; you must call <code>assertAll()</code> at the end to report failures." },
        { q: "Difference between assert and verify?", a: "<b>Assert</b> checks a condition and stops execution if it fails.<br><b>Verify</b> checks a condition but continues execution — typically done using SoftAssert in TestNG." },
        { q: "3 methods with priority 0, 1, and 0 — which executes first?", a: "The two methods with priority <b>0</b> execute first in <b>alphabetical order</b>, then the method with priority 1." },
        { q: "Some methods have priority, some do not — will they execute?", a: "Yes. Methods without an explicit priority default to <b>priority 0</b> and execute first." },
        { q: "How do you re-run only failed test cases?", a: "After execution, a <code>failed.xml</code> file is generated in the <b>test-output</b> folder. Running that file re-executes only the failed tests." },
        { q: "What are TestNG listeners?", a: "<code>ITestListener</code> is an interface with methods like onTestStart, onTestSuccess, onTestFailure, onTestSkip. In onTestFailure we write the screenshot capture code." },
        { q: "How do you get the test case name from the listener class?", a: "Using the <code>ITestResult</code> class." },
        { q: "What is DataProvider?", a: "Generates data and passes it to test methods — the test method repeats for each data set.<pre>@DataProvider(name = \"loginData\")\npublic Object[][] getData() {\n    return new Object[][] {\n        {\"user1\", \"pass1\"},\n        {\"user2\", \"pass2\"}\n    };\n}\n\n@Test(dataProvider = \"loginData\")\npublic void loginTest(String username, String password) { ... }</pre>" },
        { q: "DataProvider passes 5 inputs but you only want 1st, 2nd, 4th, 5th — how?", a: "Use the <b>indices</b> attribute — only the specified index numbers will be used." },
        { q: "How to skip a test case?", a: "Using <code>enabled = false</code>, or via <code>dependsOnMethods</code> — if the dependent method fails, the other is skipped." },
        { q: "What is the use of the testng.xml file?", a: "Run multiple classes at once, include/exclude mechanism, parallel testing, and passing parameters." },
        { q: "How to pass parameters from xml to a test case?", a: "Using the <code>@Parameters</code> annotation." },
        { q: "Difference between @BeforeMethod and @BeforeTest?", a: "<b>@BeforeMethod</b> runs before <b>every</b> @Test method.<br><b>@BeforeTest</b> runs only <b>once</b> before all test methods in the &lt;test&gt; tag." },
        { q: "Difference between JUnit and TestNG?", a: "Parameters cannot be passed in JUnit the way TestNG supports via DataProvider and @Parameters. TestNG also offers grouping, dependency and better parallel support." }
      ]
    },
    {
      topic: "Framework",
      questions: [
        { q: "Explain your framework", a: "Hybrid framework — data driven + keyword driven.<br>· Java as programming language<br>· Page Factory (implementation of POM)<br>· POM as design pattern<br>· Base class for common setup/teardown and browser init<br>· TestNG as unit test framework<br>· Maven for build management<br>· Jenkins pipeline for CI/CD<br>· Git for version control<br>· Extent Reports for reporting" },
        { q: "What reusable components have you created?", a: "1. <b>Base Class</b> — WebDriver init, browser setup, teardown<br>2. <b>Property/Config Utility</b> — read URL, username, password<br>3. <b>Page Object Classes</b> — locators and actions<br>4. <b>Reusable Utils</b> — waits, dropdowns, screenshots, scrolling, window switching, alerts<br>5. <b>Reporting Utility</b> — ExtentReports / TestNG listeners<br>6. <b>Excel/CSV Utility</b> — Apache POI" },
        { q: "Difference between POM and Page Factory?", a: "<b>POM</b> is a design pattern. <b>Page Factory</b> is an implementation of POM where we use <code>@FindBy</code> for auto-initialization of elements.<br><code>PageFactory.initElements(driver, this);</code>" },
        { q: "Advantage of Page Object Model?", a: "Reusability and maintainability — if there is a change, we update the locator in one page object class instead of many test scripts." },
        { q: "What is object repository and how to implement it?", a: "A repository where we create page object classes for different web pages so they can be reused. Implemented using POM with the Page Factory design pattern." },
        { q: "How do you read data from a properties file?", a: "<pre>FileInputStream fis = new FileInputStream(\"config.properties\");\nProperties prop = new Properties();\nprop.load(fis);\nString url = prop.getProperty(\"url\");</pre>" },
        { q: "Which Apache POI methods have you used?", a: "getStringCellValue(), XSSFWorkbook, XSSFSheet, getSheetAt(), getLastRowNum(), getRow(), getCell()." },
        { q: "What reports have you used?", a: "Extent Reports in HTML format, including screenshots on failure." },
        { q: "How do you maintain the suite when the UI changes frequently?", a: "Because we follow POM, locator updates are centralized in page classes — update once instead of across many scripts. We use stable attributes, avoid brittle XPath, and collaborate with developers to maintain automation-friendly IDs. Regular refactoring keeps the suite stable." },
        { q: "How to reduce automation execution time?", a: "Prioritize test cases · Parallel execution · Run headless / non-GUI via Jenkins · Remove unnecessary test cases · Use data-driven testing." },
        { q: "What challenges do you face in automation?", a: "Dynamic elements · Synchronization issues · Stale element exceptions · CAPTCHA handling · UI changes breaking locators · Nested frames · Cross-browser compatibility · Data reusability." },
        { q: "A test passes locally but fails in CI/CD — how do you debug?", a: "1. Check environment differences — browser version, OS, configuration<br>2. Analyze execution logs, screenshots and videos<br>3. Verify waits — many failures are synchronization/timing<br>4. Check test data availability and dependent services<br>5. Reproduce locally in headless or CI-like settings" },
        { q: "If your UI test depends on API data, how do you handle it?", a: "Create test data via API calls before executing UI tests — this ensures stable, predictable data. We can also validate UI data against the API response for true end-to-end validation." },
        { q: "What metrics do you share with stakeholders?", a: "Pass/fail status, execution summary, failure details with screenshots. Also regression coverage, flaky tests, defect mapping, and trend reports showing quality improvement over time." },
        { q: "How do you prioritize 100 test cases for automation?", a: "1st priority — smoke test cases and tests re-run repeatedly; also data-driven tests. 2nd priority — regression test cases." },
        { q: "Which test cases would you exclude from automation?", a: "Cases that are not repetitive, low priority per requirement, or not needed for regression. Also, never automate a case that has not been executed manually at least once." }
      ]
    },
    {
      topic: "Grid, Headless & Capabilities",
      questions: [
        { q: "What are desired capabilities?", a: "Used to execute scripts across different browsers, OS and versions — mainly in Selenium Grid and remote execution. Specified as <b>key-value pairs</b>.<pre>DesiredCapabilities capabilities = new DesiredCapabilities();\ncapabilities.setBrowserName(\"chrome\");\ncapabilities.setPlatform(Platform.LINUX);</pre>" },
        { q: "What is headless testing?", a: "Running the script without a visible UI — lets you perform other activities meanwhile. Remember to set window resolution or it may error.<pre>ChromeOptions options = new ChromeOptions();\noptions.addArguments(\"--headless\");\nWebDriver driver = new ChromeDriver(options);</pre>" }
      ]
    },
    {
      topic: "Maven, Jenkins & Git",
      questions: [
        { q: "Benefits of using Maven?", a: "Build creation and testing · Dependency management — auto-downloads from global to local repo · maven-surefire-plugin runs testng.xml from the command line · Easy project sharing since dependencies are declared in pom.xml, not hard-coded." },
        { q: "What does pom.xml contain?", a: "Plugins and dependencies — compiler plugin, surefire plugin, and dependencies such as TestNG and Selenium." },
        { q: "Difference between mvn test, mvn clean and mvn install?", a: "<b>mvn test</b> — executes tests<br><b>mvn clean</b> — deletes the target directory<br><b>mvn install</b> — compiles source, packages into a jar and installs artifacts" },
        { q: "What tasks have you done in Jenkins?", a: "Set the Git repo path so Jenkins fetches code · Choice parameters to select browser · Headless mode execution · Email notification on build completion with pass/fail/skip results." },
        { q: "How does Jenkins get the code?", a: "By configuring the GitHub repository path in the Jenkins job configuration." },
        { q: "Basic Git commands", a: "<pre>git init\ngit add *                    # add all files\ngit add [filename]           # add single file\ngit commit -m \"message\"\ngit push origin master\ngit pull origin master\ngit checkout -b [branchname] # create new branch\ngit checkout master          # switch branch\ngit merge master</pre>" },
        { q: "How do you handle a merge conflict?", a: "By modifying the file, accepting the required changes and deleting the remaining conflicting lines." },
        { q: "How frequently do you check in code?", a: "Mostly daily, whenever code is written or modified. If review is required, the senior reviews and merges." }
      ]
    },
    {
      topic: "BDD Cucumber",
      questions: [
        { q: "Explain BDD", a: "Behaviour Driven Development — scenarios written in Given / When / Then format, readable by non-technical stakeholders." },
        { q: "What files do you create in BDD?", a: "Feature file, Step Definition file, Test Runner." },
        { q: "What does the feature file contain?", a: "The scenarios we want to test, written in Gherkin (Given/When/Then)." }
      ]
    },
    {
      topic: "Java — OOPs",
      questions: [
        { q: "Which Java features do you use in automation?", a: "The four OOPs concepts:<br><b>Inheritance</b> — base class extended in test scripts for common setup like browser init<br><b>Abstraction</b> — hiding implementation, exposing functionality (e.g. loginPage.login(user, pass))<br><b>Polymorphism</b> — overloading and overriding<br><b>Encapsulation</b> — WebElements kept private via @FindBy, exposed through public methods" },
        { q: "What is Inheritance?", a: "Inheriting properties from a base class to reuse code. In automation we put browser init and teardown in the base class and extend it in test classes using the <code>extends</code> keyword." },
        { q: "Types of inheritance in Java", a: "Single, Multilevel and Multiple — <b>multiple inheritance is not supported</b> with classes in Java; achieve it using interfaces." },
        { q: "Why is multiple inheritance not supported?", a: "If two parent classes have methods with the same name, the child class would not know which one to call — Java gets confused. Achieve it via interfaces instead:<br><code>class A implements InterfaceB, InterfaceC</code>" },
        { q: "Method overloading vs method overriding", a: "<b>Overloading</b> — same class, same method name, different argument count or data type (compile-time polymorphism). Example: Select class — selectByIndex, selectByVisibleText.<br><b>Overriding</b> — parent and child class, same method name, same data type and argument count (runtime polymorphism)." },
        { q: "What is Abstraction? Give an automation example", a: "Hiding internal implementation and showing only functionality. The test class does not need to know:<pre>driver.findElement(username).sendKeys(user);\ndriver.findElement(password).sendKeys(pass);\ndriver.findElement(loginButton).click();</pre>It simply calls:<pre>loginPage.login(\"anand\", \"password123\");</pre>" },
        { q: "What is an abstract method and where do you write the implementation?", a: "A method without implementation, declared with the <code>abstract</code> keyword, inside an abstract class or interface.<pre>public abstract void login(String username, String password);</pre>The implementation goes in the concrete class that extends the abstract class or implements the interface." },
        { q: "What is Encapsulation?", a: "Wrapping data into a single unit — keeping WebElements/variables private and exposing actions through public methods (getters/setters)." },
        { q: "Difference between method and constructor", a: "<b>Name</b> — method can be anything; constructor must match the class name.<br><b>Call</b> — method called explicitly; constructor called automatically on object creation.<br><b>Return type</b> — method can have one; constructor has none (not even void)." },
        { q: "Is a constructor static or non-static?", a: "<b>Non-static.</b>" },
        { q: "Method overloading vs constructor overloading", a: "Method overloading — same class, same name, different args. Constructor overloading — same name as the class, no return type, can be parameterized or non-parameterized." },
        { q: "Can we override static methods?", a: "<b>No</b> — we cannot override a static method, but we can extend/inherit it in the child class." }
      ]
    },
    {
      topic: "Java — Keywords & Core",
      questions: [
        { q: "What is the use of the final keyword?", a: "Can be used at class, method and variable level:<br>1. <b>Class</b> — cannot be extended (no child class)<br>2. <b>Method</b> — cannot be overridden<br>3. <b>Variable</b> — cannot reassign its value<br>All violations throw a compilation error." },
        { q: "Difference between final and finally", a: "<b>final</b> is a keyword. <b>finally</b> is a block used in exception handling — it executes whether the test passes or fails, and must follow try/catch. It will not execute only if the JVM is forcefully closed. Commonly used to terminate browser sessions." },
        { q: "What is the finalize method?", a: "Comes from the base Object class and is used for cleaning up unused objects — garbage collection." },
        { q: "What is the use of the static keyword?", a: "Creates class-level members shared across all objects, accessible without creating an instance — via the class name." },
        { q: "Why use static vs non-static?", a: "<b>static</b> — value or method common to all objects<br><b>non-static</b> — value specific to each object<pre>static String companyName = \"Amazon\";  // common for all\nString customerName;                   // different per user</pre>" },
        { q: "Difference between this and super keyword", a: "<b>this</b> — refers to the current class variable/instance.<br><b>super</b> — calls the method or constructor of the parent class from a subclass." },
        { q: "What are the access modifiers?", a: "<b>public</b> — accessible everywhere<br><b>private</b> — within the same class only<br><b>protected</b> — within the package, and outside the package if inherited<br><b>default</b> — within the package only (applied when nothing is specified)" },
        { q: "Default access modifier for an interface method?", a: "<b>public</b>." },
        { q: "Difference between == and equals()?", a: "<code>==</code> compares object references (memory addresses). <code>equals()</code> compares the contents/values of objects." },
        { q: "What is a String in Java?", a: "An object representing a sequence of characters. Two types — String literal and creating a String object with new." },
        { q: "Difference between StringBuilder and StringBuffer?", a: "<b>StringBuilder</b> — not thread safe, faster, methods not synchronized.<br><b>StringBuffer</b> — thread safe, slower, methods synchronized.<br>Both are mutable." },
        { q: "What is the Scanner class?", a: "Part of java.util, used to read input from sources such as the keyboard, files or streams." },
        { q: "How do you handle exceptions in Java?", a: "Using try-catch. If the exception type is unknown, catch the main <code>Exception</code> class." },
        { q: "What is multithreading in Java?", a: "Concurrent execution — multiple tasks run simultaneously. A <b>thread</b> is an independent flow of execution. <b>Synchronization</b> ensures thread safety and prevents race conditions." },
        { q: "Difference between Comparable and compareTo?", a: "<b>Comparable</b> is an interface used for natural sorting; <b>compareTo()</b> is the method implemented to define that sorting logic." }
      ]
    },
    {
      topic: "Java — Collections",
      questions: [
        { q: "Difference between Set and List", a: "<b>Set</b> — no duplicates, return type <code>Set&lt;String&gt;</code>, used for handling windows.<br><b>List</b> — allows duplicates, return type <code>List&lt;WebElement&gt;</code>, used for handling multiple web elements." },
        { q: "Difference between Collection and Collections", a: "<b>Collection</b> is an interface representing a group of objects — List, Set, Queue.<br><b>Collections</b> is a utility class providing methods like sort(), reverse(), shuffle()." },
        { q: "Difference between List and Map", a: "<b>List</b> — ordered collection, access by index, duplicates allowed (ArrayList, LinkedList, Vector).<br><b>Map</b> — key-value pairs, access by unique key, keys must be unique (HashMap, TreeMap, LinkedHashMap)." },
        { q: "Difference between Array and ArrayList", a: "<b>Array</b> — static, fixed size, cannot be resized, faster.<br><b>ArrayList</b> — dynamic, resizable, slower." },
        { q: "Difference between ArrayList and HashSet", a: "<b>ArrayList</b> — implements List, allows duplicates, maintains insertion order, supports indexing.<br><b>HashSet</b> — implements Set, no duplicates, no insertion order, no indexing." },
        { q: "ArrayList vs LinkedList vs Vector", a: "<b>ArrayList &amp; Vector</b> — resizable, slower insertion/deletion in the middle, lower memory overhead.<br><b>LinkedList</b> — doubly linked list, faster insertion/deletion, higher memory overhead." },
        { q: "Difference between HashMap and Hashtable", a: "<b>HashMap</b> — not synchronized, allows one null key and multiple null values, faster.<br><b>Hashtable</b> — synchronized, no null key or values, slower." },
        { q: "Difference between HashMap and HashSet", a: "<b>HashMap</b> — stores key-value pairs, no duplicate keys (duplicate values allowed), accessed by key.<br><b>HashSet</b> — stores only values, no duplicates, accessed by value." },
        { q: "Where have you used HashMap and Hashtable?", a: "<b>HashMap</b> — store test data and config like usernames, passwords, environment URLs.<pre>HashMap&lt;String, String&gt; testData = new HashMap&lt;&gt;();\ntestData.put(\"username\", \"testuser\");\ndriver.get(testData.get(\"url\"));</pre><b>Hashtable</b> — parallel testing setup for browser and environment (thread-safe)." },
        { q: "Where have you used HashMap, LinkedHashMap and TreeMap?", a: "In an eCommerce framework:<br><b>HashMap</b> — product name and price for UI vs API validation<br><b>LinkedHashMap</b> — maintain the order of products added to the cart<br><b>TreeMap</b> — verify sorting functionality like sort by name or price" },
        { q: "How to extract data from an ArrayList vs an Array?", a: "<b>ArrayList</b> — <code>list.get(index)</code><br><b>Array</b> — <code>a[index]</code><br><b>Set</b> — using an Iterator or for-each loop (no index)." }
      ]
    },
    {
      topic: "Java — Coding Programs",
      questions: [
        { q: "Find the largest of 2 numbers without using if", a: "<pre>int a = 10;\nint b = 20;\nint large = a &gt; b ? a : b;\nSystem.out.println(large);</pre>" },
        { q: "Count upper case and lower case characters in a string", a: "<pre>String s = \"Welcome to AutomatioN\";\nint lower = 0, upper = 0;\n\nfor (int i = 0; i &lt; s.length(); i++) {\n    char ch = s.charAt(i);\n    if (ch &gt;= 65 &amp;&amp; ch &lt;= 90) {\n        upper++;\n    } else {\n        lower++;\n    }\n}\nSystem.out.println(\"Lower \" + lower);\nSystem.out.println(\"Upper \" + upper);</pre>" },
        { q: "Reverse a string", a: "<pre>String name = \"Welcome\";\nString reverse = \"\";\n\nfor (int i = name.length() - 1; i &gt;= 0; i--) {\n    reverse = reverse + name.charAt(i);\n}\nSystem.out.println(reverse);</pre>" },
        { q: "Find the vowels in a string", a: "<pre>String name = \"Anand\";\n\nfor (char ch : name.toCharArray()) {\n    if (\"aeiou\".indexOf(ch) != -1) {\n        System.out.println(ch);\n    }\n}</pre>" },
        { q: "Sum of array elements", a: "<pre>int[] numbers = {1, 2, 3, 4, 5};\nint total = 0;\n\nfor (int i = 0; i &lt; numbers.length; i++) {\n    total += numbers[i];\n}\nSystem.out.println(total);</pre>" },
        { q: "Count even and odd numbers in an array", a: "<pre>int[] a = {1, 2, 3, 4, 5};\nint even = 0, odd = 0;\n\nfor (int i = 0; i &lt; a.length; i++) {\n    if (a[i] % 2 == 0) even++;\n    else odd++;\n}\nSystem.out.println(even);\nSystem.out.println(odd);</pre>" },
        { q: "Split a comma-separated string", a: "<pre>String s1 = \"Java,selenium,testng,maven\";\nString[] str = s1.split(\",\");\n\nfor (String word : str) {\n    System.out.println(word);\n}</pre>Return type of split() is an <b>array</b>." },
        { q: "Concatenate three strings", a: "<pre>String str1 = \"ABC\";\nString str2 = \"XYZ\";\nString str3 = \"PQR\";\n\nString a = str1.concat(str2).concat(str3);\nSystem.out.println(a);</pre>" },
        { q: "How to compare two strings?", a: "Using <code>equals()</code> or <code>compareTo()</code>." }
      ]
    },
    {
      topic: "Manual Testing & Agile",
      questions: [
        { q: "Tell me about yourself", a: "My name is Anand Soni. I have around 5 years of experience as a QA in manual and automation testing, currently working with Capgemini. My skill set is Selenium with Java, TestNG, Maven, Jenkins, Git and BDD Cucumber. I have worked across banking, insurance and eCommerce domains, and have handled multiple projects independently at a startup." },
        { q: "What is STLC?", a: "Software Testing Life Cycle — a sequence of activities to ensure software works per client requirements:<br>1. Requirement gathering<br>2. Test planning<br>3. Test environment setup<br>4. Test case design<br>5. Test case execution<br>6. Bug reporting<br>7. Test cycle closure" },
        { q: "What are the contents of a test case?", a: "Test case ID, description, test steps, test data, expected result, actual result, status." },
        { q: "What types of testing do you cover manually?", a: "Smoke, Sanity, Functional, Integration, E2E, Regression, Retesting, Ad-hoc / out-of-the-box, Negative testing." },
        { q: "What is integration testing?", a: "Testing the data flow from one module to another. For example, entering a valid email and password and clicking login — verifying the user can log in and data flows correctly between modules." },
        { q: "Functional vs non-functional testing", a: "<b>Functional</b> — the product works as per requirement.<br><b>Non-functional</b> — performance, stress and load testing. Non-functional is done after functional testing is stable." },
        { q: "Which test design techniques do you follow?", a: "Equivalence Class Partitioning (ECP), Boundary Value Analysis (BVA), Error Guessing, Decision Table." },
        { q: "How do you ensure all scenarios are covered?", a: "Start from the acceptance criteria in the user story, then add cases once the UI is developed. Track test cases against the AC, maintain a module-wise checklist, and follow a Requirement Traceability Matrix (RTM). Verify E2E and critical business flows work without blocker or critical issues." },
        { q: "When do you prepare the RTM?", a: "While creating test cases." },
        { q: "What is priority and severity?", a: "<b>Severity</b> — impact of the bug on the application, defined by the QA.<br><b>Priority</b> — how soon it should be fixed, defined by the developer/PO." },
        { q: "Logo colour slightly off or a spelling mistake in the company name — severity and priority?", a: "<b>Severity: Low · Priority: High</b> — it affects the company brand." },
        { q: "Application crashes on a rare corner page — severity and priority?", a: "<b>Severity: High · Priority: Low</b> — big impact but rarely encountered." },
        { q: "What is your bug reporting process?", a: "First check if the bug is already reported. Then create it with a proper summary, steps to reproduce, screenshot, build version, and assign it to the right developer." },
        { q: "The developer does not accept your bug — what do you do?", a: "Discuss to understand their perspective and reason for rejection. Re-verify the issue to confirm it is valid and reproducible. Provide supporting evidence — logs, screenshots, steps. If disagreement remains, involve the senior or lead to reach a mutual conclusion." },
        { q: "Have you missed a bug in production? What steps did you take?", a: "Yes. We fix it as a hot fix, do a <b>root cause analysis</b> of why it occurred, verify in the QA environment, retest after the fix, then move to production.<br>Follow-up actions:<br>1. Root cause analysis<br>2. Check in the test management tool<br>3. Check the RTM<br>4. Add to the regression suite if missing" },
        { q: "When do you perform regression testing?", a: "When there is a code change from the developer in a new build, after 4-5 builds once stable, after bug fixes, and before moving to production — to ensure existing functionality is not affected." },
        { q: "What do you consider during regression testing?", a: "Identify and prioritize the most critical test cases covering important functionality and areas prone to regression. Consider frequently used areas and integration points — e.g. if changes on a client portal affect the admin panel, test both. First run smoke/sanity on the build, then go in-depth." },
        { q: "Do you ask the developer which areas are impacted?", a: "Yes — we discuss impacted areas with developers. Sometimes they flag a module they are unsure about for in-depth testing. As testers we also apply our own product understanding to identify integration points." },
        { q: "Difference between change request and feature request?", a: "<b>Change request</b> — the product owner asks for a change to the existing product before it moves to production. Bug fixes fall under CR.<br><b>Feature request</b> — the customer asks for a new feature not currently in the product. Enhancements fall under this." },
        { q: "Difference between Epic, Story and Task?", a: "<b>Epic</b> — a large chunk of product requirement<br><b>Story</b> — a particular user story<br><b>Task</b> — an activity such as creating test cases, E2E testing, regression testing" },
        { q: "What challenges do you face in Agile?", a: "Requirements keep changing, so test cases need frequent modification. Less documentation and short 2-3 week sprints. Communication gaps can cause unclear requirements — we mitigate by adding comments on the user story and tagging the relevant people for reference." },
        { q: "What is a sprint review meeting?", a: "Held after sprint completion — we discuss how many bugs were found, how many scenarios were executed, and overall sprint outcomes." },
        { q: "What are story points?", a: "A rough estimation for a story in a sprint plan — how much effort/time it will take to complete." },
        { q: "What is a scrum board?", a: "A board showing tasks in New, Active, In Progress, Resolved and Closed states, assigned to particular team members." },
        { q: "Write test cases for OTP authentication", a: "· OTP field shows proper data<br>· OTP works with valid data<br>· Should not accept special characters, alphabets or blank space<br>· Old OTP should not work<br>· Submit without OTP shows an error<br>· Restriction on OTP resend limit<br>· Multiple wrong attempts block the user<br>· User can resend OTP<br>· New OTP is sent on resend and the old one is invalidated<br>· OTP expires after a set period<br>· OTP is unique every time" },
        { q: "How many bugs have you found through automation?", a: "Around 30 to 40." },
        { q: "How many test cases have you automated?", a: "Around 250." },
        { q: "Why should we hire you?", a: "· Ready to work any shift<br>· Passionate about what I do<br>· Can pick up new technology quickly<br>· Can handle the project independently" },
        { q: "Questions to ask the interviewer", a: "· Which domain projects are you working on?<br>· Which tools and technologies does the team use?" }
      ]
    }
  ]
};
