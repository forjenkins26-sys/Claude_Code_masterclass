// BDD / Cucumber interview Q&A — sourced from Anand Soni's prep notes
// (BDD_Cucumber_Interview_Revision_Short.txt + Cucumber Notes.txt)
window.CUCUMBER_DATA = {
  section: "Cucumber",
  topics: [
    {
      topic: "BDD Fundamentals",
      questions: [
        { q: "What is BDD and how is it different from TDD?", a: "<b>BDD</b> (Behavior Driven Development) focuses on describing application behavior in simple, business-readable language using <b>Given-When-Then</b>.<br><br><b>TDD</b> (Test Driven Development) is developer-focused and involves writing unit tests before writing the actual code." },
        { q: "BDD vs Cucumber vs Gherkin — what is what?", a: "<b>BDD</b> — the framework / methodology<br><b>Cucumber</b> — the tool that implements it<br><b>Gherkin</b> — the language we write the scenarios in" },
        { q: "What is Gherkin?", a: "Gherkin is a domain-specific language using the <b>Given-When-Then</b> format to write readable test scenarios that both business and technical teams can understand." },
        { q: "What are the advantages of BDD?", a: "· Improves collaboration between business and technical teams<br>· Acts as living documentation<br>· Enhances clarity of requirements<br>· Aligns business and technical teams on expected behaviour" },
        { q: "How do you achieve 100% test coverage through the framework?", a: "Through Cucumber Gherkin scenarios — every business requirement is expressed as a feature with its scenarios, so coverage is traceable back to the requirement." }
      ]
    },
    {
      topic: "Gherkin Keywords",
      questions: [
        { q: "Give a summary of all the Gherkin keywords", a: "<b>Feature</b> — list of scenarios for a business requirement<br><b>Feature File</b> — stores the description of features and scenarios to be tested<br><b>Given</b> — precondition step<br><b>When</b> — the key action<br><b>Then</b> — observe the outcome / validation<br><b>And, But</b> — additional to the previous step, for positive and negative validation<br><b>Scenario</b> — a positive or negative test case<br><b>Scenario Outline</b> — list of steps for data-driven runs using Examples<br><b>Background</b> — steps that run before every scenario<br><b>\"\"\"</b> — docstring, documentation inside a pair of triple quotes<br><b>@</b> — tags<br><b>#</b> — comment" },
        { q: "What are the keywords used in BDD Cucumber?", a: "Feature, Scenario, Scenario Outline, Examples, Background." },
        { q: "What are the annotations used in step definitions?", a: "<code>@Given</code>, <code>@When</code>, <code>@Then</code>, <code>@And</code>" },
        { q: "Explain the Given / When / Then flow", a: "<b>Given</b> → Precondition<br><b>When</b> → Action<br><b>Then</b> → Outcome" },
        { q: "When do we mostly use And and But?", a: "When we are performing the same kind of action multiple times — they chain onto the previous Given/When/Then step instead of repeating the keyword." },
        { q: "How many Features can one feature file have?", a: "One. A single feature file contains exactly <b>1 Feature</b>, but that feature can contain multiple scenarios." },
        { q: "What is the difference between Feature and Scenario?", a: "<b>Feature</b> — the business functionality (e.g. Login)<br><b>Scenario</b> — a single test case inside that feature" }
      ]
    },
    {
      topic: "Feature Files & Step Definitions",
      questions: [
        { q: "What is a Feature File?", a: "A <code>.feature</code> file written in Gherkin that contains: Feature, Scenario, Given/When/Then steps, Background, Tags and Scenario Outline." },
        { q: "How do we create feature files?", a: "Create a file with the <code>.feature</code> extension — e.g. <code>login.feature</code>." },
        { q: "What is a Step Definition?", a: "A Step Definition contains the actual automation code for the Gherkin steps. It maps Given/When/Then steps to Java methods using annotations." },
        { q: "What do we create in the StepDef file?", a: "Classes related to our scenarios — the actual automation code behind each Gherkin step." },
        { q: "What are the important components / terminology in Cucumber?", a: "<b>Feature files</b> — we create different feature files for different functionality<br><b>Step Definition files</b> — where we write our automation code<br><b>TestRunner file</b> — connects the two and drives execution" },
        { q: "What are the interconnections in a 3-layered BDD framework?", a: "<b>Feature files</b> — we write scenarios here<br><b>Step Definitions</b> — we write the step implementation here<br><b>Runner</b> — maps the step definitions to the feature files; execution happens through the runner" },
        { q: "How do you generate snippets?", a: "Run the TestRunner class — Cucumber prints the missing step snippets in the console, which you then paste into your step definition class." },
        { q: "What happens if a step definition is missing?", a: "Cucumber marks the step as <b>Undefined</b> and provides a snippet suggestion in the console." },
        { q: "Can we create two methods with the same name in a step def file?", a: "Yes — method overloading is allowed. But <b>two step definitions cannot have the same step pattern</b>, because Cucumber will consider them ambiguous.<pre>@Given(\"user enters username\")\npublic void login() {\n}\n\n@Given(\"user enters password\")\npublic void login(String password) {\n}</pre>" },
        { q: "How do you write and maintain reusable code across the framework?", a: "With the help of Step Definitions and their regular-expression context — the same step implementation is reused across multiple feature files." },
        { q: "What is the typical framework folder structure?", a: "· Drivers and feature files at project level<br>· Step definitions under <code>src/test/java</code><br>· TestRunner class under the <code>com.runner</code> package<br>· <code>cucumber.properties</code> under <code>src/test/resources</code>" }
      ]
    },
    {
      topic: "Scenario Outline, Background & DataTable",
      questions: [
        { q: "What is a Scenario Outline?", a: "Used to execute the same scenario multiple times with different data sets using the <b>Examples</b> table.<pre>Scenario Outline: Login\n  Given user enters &lt;username&gt; and &lt;password&gt;\n\nExamples:\n  | username | password |\n  | user1    | pass1    |\n  | user2    | pass2    |</pre>" },
        { q: "Scenario vs Scenario Outline", a: "<b>Scenario</b> — a series of steps, executed once with fixed data<br><b>Scenario Outline</b> — test data is replaced with multiple sets of data, so the script runs once per row of the Examples table" },
        { q: "What is Background?", a: "Background defines common preconditions that run before <b>each scenario</b> within a feature file — used when every scenario needs the same setup." },
        { q: "What is the scope of the Background keyword?", a: "Background is specific to <b>that particular feature file only</b>, not to any other feature file. It is most useful when the same prerequisite applies to every scenario in that one file." },
        { q: "What is a DataTable?", a: "A DataTable passes structured tabular data from the feature file into the step definitions." },
        { q: "Scenario Outline vs DataTable", a: "<b>Scenario Outline</b> — controls how many times the scenario executes<br><b>DataTable</b> — controls structured data within a <i>single</i> scenario execution" },
        { q: "How do you parameterize test cases with multiple sets of data?", a: "Using the <b>Scenario Outline</b> and <b>Examples</b> keywords." },
        { q: "How do you data-drive data into the test cases?", a: "Using <b>DataTables</b> for structured data inside a scenario." }
      ]
    },
    {
      topic: "Runner Class & CucumberOptions",
      questions: [
        { q: "What is the Runner class?", a: "The Runner class controls execution using <code>@CucumberOptions</code>. It defines the feature path, glue path, plugins, tags and dryRun." },
        { q: "What is @CucumberOptions?", a: "Used in the Runner class to configure execution behaviour — <code>features</code>, <code>glue</code>, <code>tags</code>, <code>plugin</code>, <code>monochrome</code>, <code>dryRun</code>." },
        { q: "What is Glue?", a: "Glue specifies the package path where the step definition files are located, so Cucumber knows where to look for step implementations." },
        { q: "What is dryRun?", a: "<b>dryRun = true</b> → validates step mappings only; checks that every Gherkin step has a matching step definition, without running the tests.<br><b>dryRun = false</b> → executes the actual automation tests." },
        { q: "What is Monochrome?", a: "<b>monochrome = true</b> removes special/unreadable characters from the console output and makes the Cucumber log much more readable." },
        { q: "What does plugin = pretty do?", a: "<code>pretty</code> prints the Gherkin steps in a readable format in the console, so you can see exactly which steps ran." },
        { q: "What does this plugin configuration do?<br><code>plugin = {\"pretty\", \"json:target//cucumber.json\", \"html:target//index.html\"}</code>", a: "· <b>pretty</b> — readable step-by-step console output<br>· <b>json:target//cucumber.json</b> — generates a JSON report at that path<br>· <b>html:target//index.html</b> — generates an HTML report at that path" },
        { q: "How can we get the report?", a: "In the TestRunner, add the report to the plugin option — e.g. <code>html:target/cucumber.html</code> — specifying the path where the report should be stored." },
        { q: "What types of report can we get?", a: "HTML, JSON, XML and JUnit." },
        { q: "How to generate HTML and JUnit reports?", a: "In the TestRunner class, pass the html and junit details inside the <code>plugin</code> option of <code>@CucumberOptions</code>." },
        { q: "If we need Given / When / Then in the report, what do we need to do?", a: "Add <code>stepNotifications = true</code> in the Test Runner file, so you can see which individual step passed or failed." },
        { q: "What can be done through the runner class?", a: "· Do a dry run — check the execution of scenarios without actually running them<br>· Group our test scenarios using tags<br>· Run our test scenarios" },
        { q: "What is the use of the cucumber.properties file?", a: "Set <code>cucumber.publish.enabled=true</code> (or false) to control the Cucumber publish banner message in the output. It lives in <code>src/test/resources</code>." },
        { q: "How to run all tests in a single click?", a: "In the TestRunner class pass the features folder path, then run the runner class." },
        { q: "What is the difference between TestNG runner and JUnit runner?", a: "For the <b>TestNG runner</b> we extend <code>AbstractTestNGCucumberTests</code>.<br>For the <b>JUnit runner</b> we add the <code>@RunWith</code> annotation.<br><br>⭐ <i>Killer line:</i> \"TestNG provides more flexibility and parallel control compared to JUnit.\"" },
        { q: "Which dependencies do we need for Cucumber?", a: "selenium-java, cucumber-java, and cucumber-junit (or cucumber-testng)." },
        { q: "Which plugin do we need to add for Cucumber?", a: "The Cucumber plugin from the Eclipse Marketplace (for Gherkin syntax highlighting and step navigation)." }
      ]
    },
    {
      topic: "Tags",
      questions: [
        { q: "What are Tags?", a: "Tags (e.g. <code>@smoke</code>, <code>@regression</code>) are used to group scenarios and control selective execution from the runner class." },
        { q: "What is the use of tags?", a: "It is a grouping concept — it lets you run only the subset of scenarios you care about." },
        { q: "How can we run multiple tests with multiple tags?", a: "Use logical operators in the runner:<br><br><b>Include:</b> <code>tags = \"@RegTest or @SmokeTest\"</code><br><b>Both must match:</b> <code>tags = \"@smoke and @regression\"</code><br><b>Exclude:</b> <code>tags = \"not @SanityTest\"</code>" },
        { q: "Can we put two tags on a particular scenario?", a: "Yes. Tag the scenario with both <code>@RegTest</code> and <code>@SmokeTest</code> — it will then run as part of either group." },
        { q: "How do you control which tests run based on need?", a: "Using the <code>@tags</code> concept in the feature file plus the <code>tags</code> option in the runner." },
        { q: "How to run specific scenarios?", a: "Use tags, or execute by line number — e.g. <code>login.feature:15</code>." }
      ]
    },
    {
      topic: "Hooks",
      questions: [
        { q: "What are Hooks?", a: "Hooks (<code>@Before</code>, <code>@After</code>) are blocks of code that run at various points in the Cucumber execution cycle — typically before and after each scenario, for driver setup and teardown." },
        { q: "@Before vs Background", a: "<b>@Before</b> — a technical hook executed before each scenario (<i>global scope</i>, applies across feature files)<br><b>Background</b> — business-level setup written inside the feature file (<i>feature scope</i>, that file only)" },
        { q: "What runs first — @Before or Background?", a: "<b>@Before</b> runs first, then Background." },
        { q: "Should Background and Hooks be used together?", a: "It is not a good practice to use both together.<br><br>Use <b>hooks</b> when the feature file has hybrid/different scenarios needing different setup.<br>Use <b>Background</b> when all scenarios in that file share the same prerequisite." },
        { q: "How do you write a prerequisite for a specific tag only?", a: "Use a tagged hook. For example <code>@Before(\"@RegTest\")</code> — that setup executes only for scenarios tagged <code>@RegTest</code>." },
        { q: "What are @BeforeStep and @AfterStep?", a: "<b>@BeforeStep</b> — runs before each step<br><b>@AfterStep</b> — runs after each step<br><br>Commonly used for logging and taking screenshots at step level." },
        { q: "What is the purpose of Hooks Order?", a: "Order controls the execution priority when multiple hooks exist. The <b>lower order value executes first</b>." },
        { q: "How do you separate test code from common pre/post requisites?", a: "Using the Hooks concept — <code>@Before</code> and <code>@After</code> — along with tags and Background where appropriate." }
      ]
    },
    {
      topic: "Execution, Parallel & Integration",
      questions: [
        { q: "How do you achieve Parallel Execution?", a: "Extend <code>AbstractTestNGCucumberTests</code> and enable the parallel data provider:<pre>public class TestRunner extends AbstractTestNGCucumberTests {\n\n    @Override\n    @DataProvider(parallel = true)\n    public Object[][] scenarios() {\n        return super.scenarios();\n    }\n}</pre>" },
        { q: "Why should you split scenarios across multiple feature files?", a: "Parallel execution happens at <b>feature file</b> level, not scenario level.<br><br>50 scenarios in 1 feature file → run sequentially.<br>10 scenarios across 5 feature files → run in parallel.<br><br>Execute via <b>Run As → Maven Test</b>." },
        { q: "Cucumber vs TestNG", a: "<b>Cucumber</b> — defines behaviour using Gherkin<br><b>TestNG</b> — manages execution using annotations and <code>testng.xml</code>" },
        { q: "Can Cucumber work without Selenium?", a: "Yes. Cucumber can be used for API, backend or unit testing — it does not require UI automation." },
        { q: "How do you integrate Cucumber with Selenium?", a: "· Add the dependencies in <code>pom.xml</code><br>· Write Selenium WebDriver code inside the step definitions<br>· Use hooks for driver setup and teardown" },
        { q: "What is PicoContainer?", a: "A Dependency Injection mechanism used to share objects (like the WebDriver instance) between different step definition classes." },
        { q: "What happens when we use 2 different step def files for an E2E flow?", a: "It throws a <b>NullPointerException</b>, because each class gets its own object. Fix it with Dependency Injection by adding the <b>picocontainer</b> dependency so state is shared." },
        { q: "How do you handle exceptions in Cucumber?", a: "Use try-catch only where genuinely needed, but <b>allow exceptions to fail the scenario</b> — a swallowed exception hides a real defect. Use hooks for logging and screenshots on failure." }
      ]
    }
  ]
};
