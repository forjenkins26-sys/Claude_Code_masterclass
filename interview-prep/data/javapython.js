// Java + Python QA Automation interview Q&A — sourced from Anand Soni's prep notes
// (Java_Python_QA_Automation_30_Questions_Answers.txt)
window.JAVAPYTHON_DATA = {
  section: "Java / Python",
  topics: [
    {
      topic: "Java — OOP & Core Concepts",
      questions: [
        { q: "What are the four OOP principles?", a: "<b>1. Encapsulation</b> — bundle data and methods together and restrict direct access<br><b>2. Inheritance</b> — child reuses parent behaviour using <code>extends</code><br><b>3. Polymorphism</b> — the same method name behaves differently through overloading / overriding<br><b>4. Abstraction</b> — hide implementation details and expose only what is required<br><br><b>QA examples:</b> BasePage / BaseTest inheritance, private locators, overloaded utilities, <code>login()</code> hiding locator details." },
        { q: "Overloading vs Overriding", a: "<b>Overloading</b> — same method name, different parameters, usually in the same class.<br><b>Overriding</b> — child class provides its own implementation of an inherited parent method with the same method signature.<pre>selectCountry(int index)\nselectCountry(String visibleText)</pre>The example above is <b>overloading</b>." },
        { q: "Interface vs Abstract Class", a: "An <b>interface</b> defines a contract. An <b>abstract class</b> can contain abstract methods plus implemented/common behaviour.<br><br>A class can <b>implement multiple interfaces</b> but <b>extend only one class</b>.<br><br>⚠️ <b>Modern Java note:</b> don't say an interface always gives 100% abstraction — interfaces can contain <code>default</code> and <code>static</code> implementations." },
        { q: "What is static?", a: "<code>static</code> members belong to the <b>class</b> rather than individual objects, and can be accessed without creating an instance.<pre>public static final String BASE_URL = \"https://test.example.com\";</pre><b>QA use:</b> common constants, configuration, and suitable utility methods." },
        { q: "Explain the access modifiers", a: "<b>public</b> — accessible from anywhere<br><b>private</b> — only within the same class<br><b>protected</b> — same package, and outside the package through inheritance<br><b>default</b> (no modifier) — same package only" },
        { q: "Difference between final, finally and finalize()", a: "<b>final</b> — a keyword; can restrict variables, methods and classes<br><b>finally</b> — an exception-handling block that generally executes whether or not an exception occurs; useful for cleanup<br><b>finalize()</b> — historically associated with cleanup before garbage collection. <b>Deprecated</b> — should not be relied upon in modern Java." }
      ]
    },
    {
      topic: "Java — Strings & Comparison",
      questions: [
        { q: "== vs .equals()", a: "For objects, <code>==</code> compares <b>references</b>, while <code>.equals()</code> compares <b>logical / content equality</b> when implemented appropriately.<pre>String actual   = new String(\"Login\");\nString expected = new String(\"Login\");\n\nactual == expected          // false\nactual.equals(expected)     // true</pre><b>QA:</b> use <code>Assert.assertEquals(actualText, expectedText)</code> for value validation." },
        { q: "Show a real automation example of == vs .equals()", a: "For UI text, compare values using <code>.equals()</code> or an assertion:<pre>String actualCountry = countryDropdown\n        .getFirstSelectedOption().getText();\nString expectedCountry = \"India\";\n\nif (actualCountry.equals(expectedCountry)) { ... }\n\n// or\nAssert.assertEquals(actualCountry, expectedCountry);</pre><code>.contains(\"a\")</code> checks whether a string contains a sequence — it is <b>not</b> a reference comparison." },
        { q: "String vs StringBuilder vs StringBuffer", a: "<b>String</b> — immutable<br><b>StringBuilder</b> — mutable, <b>not</b> thread-safe, generally faster<br><b>StringBuffer</b> — mutable, synchronized / thread-safe, generally slower<pre>StringBuilder sb = new StringBuilder(\"Anand\");\nsb.append(\" Soni\");</pre>" },
        { q: "How do you avoid a NullPointerException on a String comparison?", a: "<code>browser.equals(\"Chrome\")</code> fails if <code>browser</code> is null, because a method is being called on a null reference.<br><br><b>Safe version — put the literal first:</b><pre>if (\"Chrome\".equals(browser)) { }</pre>This avoids the NullPointerException entirely." }
      ]
    },
    {
      topic: "Java — Collections",
      questions: [
        { q: "How do you remove duplicates while preserving order?", a: "Use a <b>LinkedHashSet</b>.<pre>List&lt;String&gt; browsers =\n    Arrays.asList(\"Chrome\", \"Firefox\", \"Chrome\", \"Edge\");\n\nSet&lt;String&gt; uniqueBrowsers = new LinkedHashSet&lt;&gt;(browsers);\n// [Chrome, Firefox, Edge]</pre><b>HashSet</b> — unique, order not guaranteed<br><b>LinkedHashSet</b> — unique + insertion order<br><b>TreeSet</b> — unique + sorted" },
        { q: "HashMap vs HashSet", a: "<b>HashMap</b> — key-value pairs, unique keys, duplicate values allowed, one null key and multiple null values, not synchronized<br><b>HashSet</b> — individual unique values, no duplicate elements, one null element allowed, not synchronized<br><br><b>QA:</b> HashMap for configuration; HashSet for uniqueness checks." },
        { q: "ArrayList vs HashSet", a: "<b>ArrayList</b> — duplicates allowed, insertion order maintained, index-based access<br><b>HashSet</b> — duplicates not allowed, insertion order not guaranteed, no index-based access<br><br><b>QA:</b> ArrayList when order matters; HashSet when uniqueness matters." }
      ]
    },
    {
      topic: "Java — Exceptions",
      questions: [
        { q: "try-catch vs throws", a: "<b>try-catch</b> <i>handles</i> an exception.<br><b>throws</b> <i>declares</i> in the method signature that a method may pass one or more exceptions to its caller.<pre>public void login() throws IOException { }</pre>" },
        { q: "throw vs throws", a: "<b>throw</b> explicitly throws an exception from the code / method body:<pre>throw new IllegalArgumentException(\"Invalid data\");</pre><b>throws</b> declares in the method signature that one or more exceptions may be thrown:<pre>public void login() throws IOException, SQLException { }</pre>" },
        { q: "Checked vs Unchecked exceptions", a: "<b>Checked</b> — compiler-checked, generally must be caught or declared.<br>Examples: <code>IOException</code>, <code>SQLException</code>, <code>FileNotFoundException</code><br><br><b>Unchecked</b> — extend <code>RuntimeException</code>, not forced by the compiler.<br>Examples: <code>NullPointerException</code>, <code>ArithmeticException</code>, <code>ArrayIndexOutOfBoundsException</code>, <code>IllegalArgumentException</code>" }
      ]
    },
    {
      topic: "Python — Data Types & Collections",
      questions: [
        { q: "List vs Tuple", a: "A <b>list</b> is mutable and uses <code>[]</code>. A <b>tuple</b> is immutable and uses <code>()</code>.<br><br>Lists suit data that may change; tuples suit fixed values.<pre>browsers = [\"Chrome\", \"Firefox\"]\nconfig   = (\"Chrome\", 120)</pre>" },
        { q: "List vs Set vs Dictionary", a: "<b>List</b> — ordered collection, duplicates allowed<br><b>Set</b> — unique values, duplicates not allowed<br><b>Dictionary</b> — key-value pairs<pre>users    = [\"Anand\", \"Rahul\", \"Anand\"]\nbrowsers = {\"Chrome\", \"Firefox\"}\nuser     = {\"name\": \"Anand\", \"role\": \"QA\"}</pre>" },
        { q: "What is a Dictionary and how do you read from it?", a: "A dictionary stores <b>key-value pairs</b>.<pre>user = {\"username\": \"anand\", \"role\": \"QA\"}\n\nuser.get(\"username\")   # anand\nuser.get(\"role\")       # QA</pre><b>QA:</b> useful for test data, configuration and API payloads." },
        { q: "How do you tell a string from a list?", a: "<code>\"Anand\"</code> is a <b>str</b>. <code>[\"Anand\", \"Rahul\", \"Amit\"]</code> is a <b>list</b>.<br><br><code>Rahul</code> is <code>names[1]</code> — Python indexing is <b>zero-based</b>." },
        { q: "Common list operations", a: "<pre>browsers.append(\"Safari\")   # add\nbrowsers.remove(\"Firefox\")  # remove\nlen(browsers)               # size</pre>⚠️ Python uses <code>len(list)</code>, <b>not</b> <code>list.length</code>." },
        { q: "Indexing and slicing", a: "Given <code>numbers = [10, 20, 30, 40]</code>:<pre>numbers[0]     # first  -> 10\nnumbers[-1]    # last   -> 40\nnumbers[1:3]   # second and third -> [20, 30]</pre>Slicing uses <code>start:stop</code> and <b>excludes stop</b>." },
        { q: "How do you check membership in Python?", a: "<pre>\"Chrome\" in browsers</pre>Returns <code>True</code> if Chrome is present.<br><br>Python uses <code>in</code>; Java collections commonly use <code>contains()</code>." }
      ]
    },
    {
      topic: "Python — Syntax & Strings",
      questions: [
        { q: "= vs ==", a: "<code>=</code> <b>assigns</b> a value. <code>==</code> <b>compares</b> equality.<pre>name = \"Anand\"\nname == \"Anand\"   # True</pre>⚠️ Do <b>not</b> apply Java's object-reference explanation of <code>==</code> to this Python question." },
        { q: "How do you write an if condition?", a: "<pre>username = \"Anand\"\n\nif username == \"Anand\":\n    print(\"Username is correct\")</pre>Python uses <code>==</code> for equality, a <code>:</code> after the condition, and <b>indentation</b> for the body." },
        { q: "How do you define and call a function?", a: "<pre>def login(username, password):\n    print(username)\n    print(password)\n\nlogin(\"Anand\", \"Test123\")</pre>Remember: <code>def</code> <b>defines</b>; <code>login(...)</code> <b>calls</b>." },
        { q: "for vs while", a: "<b>for</b> generally iterates over a collection / sequence.<br><b>while</b> repeats while a condition is true.<pre>for browser in browsers:\n    print(browser)\n\ncount = 0\nwhile count &lt; 3:\n    count += 1</pre><b>QA:</b> for loops are common for test data, URLs, browsers and test cases." },
        { q: "break vs continue", a: "<b>break</b> terminates the loop completely.<br><b>continue</b> skips the current iteration and moves to the next.<pre>for browser in browsers:\n    if browser == \"Chrome\":\n        continue\n    print(browser)</pre>" },
        { q: "How do you remove spaces from a string?", a: "<pre>username.strip()</pre><code>strip()</code> removes leading <b>and</b> trailing whitespace.<br><code>lstrip()</code> removes leading; <code>rstrip()</code> removes trailing.<br><br>Java comparison: <code>trim()</code> → Python: <code>strip()</code>." },
        { q: "How do you change string case?", a: "<pre>username = \"Anand\"\n\nusername.upper()   # ANAND\nusername.lower()   # anand</pre>" }
      ]
    },
    {
      topic: "Java ↔ Python Cheatsheet",
      questions: [
        { q: "Most important Java → Python differences", a: "<table><tr><th>Java</th><th>Python</th></tr><tr><td><code>trim()</code></td><td><code>strip()</code></td></tr><tr><td><code>contains()</code></td><td><code>in</code></td></tr><tr><td><code>String.equals()</code></td><td><code>==</code></td></tr><tr><td><code>System.out.println()</code></td><td><code>print()</code></td></tr><tr><td><code>list.get(0)</code></td><td><code>list[0]</code></td></tr><tr><td>array / list length</td><td><code>len(list)</code></td></tr><tr><td><code>{ }</code> blocks</td><td><code>:</code> + indentation</td></tr><tr><td>method definition</td><td><code>def</code></td></tr></table>" },
        { q: "Quick revision — what to cover", a: "<b>Java:</b> OOP, collections, exceptions, overloading/overriding, access modifiers, static, strings.<br><br><b>Python:</b> variables/types, lists/tuples/sets/dictionaries, indexing/slicing, if/else, loops, functions, strings, <code>in</code>, basic exceptions." },
        { q: "How do you position your Python experience in an interview?", a: "Be honest:<br><br><i>\"My primary automation experience has been with Java. I have recently started working with Python and understand the core language concepts, and I am strengthening Python specifically for automation.\"</i>" }
      ]
    }
  ]
};
