// REST API / Rest Assured interview Q&A — sourced from Anand Soni's prep notes (Interview Questions 1-3.txt)
window.RESTAPI_DATA = {
  section: "REST API",
  topics: [
    {
      topic: "HTTP Methods & Basics",
      questions: [
        { q: "What are the different HTTP methods supported by Rest Assured?", a: "<b>GET</b> — retrieve data from the server<br><b>POST</b> — create a new record on the server<br><b>PUT</b> — update all details on the server<br><b>PATCH</b> — modify part of a record on the server<br><b>DELETE</b> — delete records from the server" },
        { q: "What is the difference between PUT and PATCH?", a: "<b>PUT replaces</b> the entire resource. <b>PATCH modifies</b> only part of the resource." },
        { q: "What is idempotent? Which requests are not idempotent?", a: "An HTTP method is idempotent if making the same request multiple times produces the same result as making it once.<br><br><b>Idempotent:</b> GET, PUT, DELETE<br><b>Not idempotent:</b> POST" },
        { q: "What is Rest Assured and why is it used in API testing?", a: "Rest Assured is a Java-based library used for automating REST APIs. It simplifies API testing with a readable BDD-style syntax (given-when-then).<br><br>It supports:<br>· All HTTP methods (GET, POST, PUT, DELETE, PATCH)<br>· Authentication (Basic, OAuth, Bearer token)<br>· JSON and XML validation<br>· Schema validation<br>· Request and response logging<br>· API chaining<br><br>It integrates well with TestNG/JUnit and makes API automation easy and maintainable." },
        { q: "What is the difference between given(), when() and then()?", a: "<b>given()</b> — preconditions: base URI, headers, body content → <i>request specification</i><br><b>when()</b> — the request type: get, put, post, patch, delete → <i>request execution</i><br><b>then()</b> — validation on the response we get → <i>response validation</i>" },
        { q: "Difference between REST and SOAP APIs? Which would you choose?", a: "<b>REST</b> — Representational State Transfer · Data format: JSON or XML · Methods: GET, PUT, POST, PATCH, DELETE<br><br><b>SOAP</b> — Simple Object Access Protocol · Data format: XML only · Uses its own set of protocols<br><br>REST is generally preferred due to its simplicity, performance and ease of use." },
        { q: "What are the key components of a RESTful API?", a: "HTTP methods, Endpoints, Request and Response, Status codes, Headers, Body." }
      ]
    },
    {
      topic: "Building Requests",
      questions: [
        { q: "How do you create a request in Rest Assured?", a: "<pre>RestAssured.baseURI = \"https://api.example.com\";\n\nString responseBody =\n    given()\n        .log().all()\n        .queryParam(\"page\", 1)\n        .header(\"Authorization\", \"Bearer token\")\n        .body(\"{\\\"name\\\":\\\"John\\\"}\")\n    .when()\n        .post(\"/users\")\n    .then()\n        .log().all()\n        .statusCode(200)\n        .extract()\n        .asString();\n\nJsonPath jp = new JsonPath(responseBody);\nString name = jp.getString(\"name\");\nSystem.out.println(name);</pre>" },
        { q: "Code examples for GET, POST, PUT and DELETE", a: "<b>GET</b> — retrieve data<pre>given()\n.baseUri(\"https://amazon.com\")\n.when()\n.get(\"/orders/1\")\n.then()\n.statusCode(200);</pre><b>POST</b> — create a resource<pre>given()\n.baseUri(\"https://amazon.com\")\n.contentType(\"application/json\")\n.body(\"{\\\"orderid\\\":43, \\\"ordername\\\":\\\"earphone\\\"}\")\n.when()\n.post(\"/orders\")\n.then()\n.statusCode(201);</pre><b>PUT</b> — update a resource<pre>given()\n.baseUri(\"https://amazon.com\")\n.contentType(\"application/json\")\n.body(\"{\\\"orderid\\\":43, \\\"orderprice\\\":3123}\")\n.when()\n.put(\"/orders/1\")\n.then()\n.statusCode(200);</pre><b>DELETE</b> — delete a resource<pre>given()\n.baseUri(\"https://amazon.com\")\n.when()\n.delete(\"/orders/1\")\n.then()\n.statusCode(200);  // or 204 No Content</pre>Note: deleting an already-deleted resource returns <b>404 Not Found</b>." },
        { q: "How do you add parameters to a request?", a: "<b>Query Param</b> — used for filtering data, comes after <code>?</code><pre>given()\n    .queryParam(\"page\", 1)\n    .queryParam(\"size\", 10)\n.when()\n    .get(\"/users\");\n// https://api.example.com/users?page=1&amp;size=10</pre><b>Path Param</b> — replaces dynamic values inside the endpoint path<pre>given()\n    .pathParam(\"userId\", 1)\n.when()\n    .get(\"/users/{userId}\");\n// https://api.example.com/users/1</pre>" },
        { q: "Difference between queryParam() and pathParam()?", a: "<b>Path param</b> → identifies a specific resource — <i>What resource</i><br><b>Query param</b> → filters the data, comes after <code>?</code> in the URL — <i>How to filter it</i>" },
        { q: "Which is more secure — queryParam or pathParam?", a: "Path params are generally used for identifying resources; query params for filtering. Neither is inherently secure — sensitive data should not go in either, since both appear in the URL and can be logged." },
        { q: "How do you send single/multiple headers?", a: "Using the <code>header()</code> method — key-value pairs like Authorization and Content-Type.<pre>given()\n    .header(\"Content-Type\", \"application/json\")\n.when()\n    .post(\"/users\")\n.then()\n    .statusCode(200);</pre>For multiple headers, chain <code>.header()</code> calls or pass a Map with <code>.headers()</code>:<pre>Map&lt;String, String&gt; headers = new HashMap&lt;&gt;();\nheaders.put(\"Authorization\", \"Bearer your-token-here\");\nheaders.put(\"Content-Type\", \"application/json\");\n\nResponse response = RestAssured.given()\n        .headers(headers)\n        .get(\"https://api.example.com/users\");</pre>" },
        { q: "What is a request body?", a: "The data sent by the client to the server as part of an API request — JSON, XML or form data. Mainly used in <b>POST</b> (create), <b>PUT</b> (update entire resource) and <b>PATCH</b> (update partial fields).<pre>given()\n    .baseURI(\"https://api.example.com\")\n    .contentType(\"application/json\")\n    .body(\"{\\\"name\\\":\\\"John\\\",\\\"email\\\":\\\"john@test.com\\\"}\")\n.when()\n    .post(\"/users\")\n.then()\n    .statusCode(201);</pre>" },
        { q: "How do you handle cookies?", a: "Using <code>cookie()</code> or <code>cookies()</code>.<br><br><b>Single cookie:</b><pre>given()\n    .cookie(\"sessionId\", \"abc123\")\n.when()\n    .get(\"/endpoint\")\n.then()\n    .statusCode(200);</pre><b>Multiple cookies:</b><pre>Map&lt;String, String&gt; cookies = new HashMap&lt;&gt;();\ncookies.put(\"cookie1\", \"value1\");\ncookies.put(\"cookie2\", \"value2\");\n\ngiven()\n    .cookies(cookies)\n.when()\n    .get(\"/endpoint\")\n.then()\n    .statusCode(200);</pre>" },
        { q: "How can we add an attachment using Rest Assured?", a: "Using the <code>multiPart()</code> method:<br><code>multiPart(\"file\", new File(\"path/to/file\"))</code>" },
        { q: "How do you bypass SSL certification in Rest Assured?", a: "Using the <code>relaxedHTTPSValidation()</code> method." }
      ]
    },
    {
      topic: "URL, URI & Endpoints",
      questions: [
        { q: "Difference between baseUrl and baseURI?", a: "<b>baseURI</b> — only the host name: <code>https://api.example.com</code><br><b>baseUrl</b> — includes the endpoint: <code>https://api.example.com/v1/users</code><br><br>In Rest Assured we keep them separate — baseURI in given(), and the endpoint resource in the when() method." },
        { q: "Difference between URL, endpoint and query param?", a: "For <code>https://api.company.com/employees/123?role=admin</code>:<br><br><b>URL</b> → the full string — everything needed to locate a resource<br><b>Endpoint</b> → <code>/employees/123</code> — the specific resource<br><b>Query param</b> → <code>role=admin</code> — additional filtering for the request" },
        { q: "How do you pass a dynamic product id in the URL?", a: "Use a path param. For <code>/api/ecom/product/delete-product/66f517faae2afd4c0b84d007</code>:<pre>given()\n    .pathParam(\"productId\", \"66f517faae2afd4c0b84d007\")\n.when()\n    .delete(\"/api/ecom/product/delete-product/{productId}\");</pre>The value is substituted at runtime." }
      ]
    },
    {
      topic: "Authentication & Authorization",
      questions: [
        { q: "Difference between Authentication and Authorization?", a: "<b>Authentication</b> — verifying the identity of the user: <i>who is the user?</i><br>Status code <b>401 Unauthorized</b> — authentication failed<br>Example: login with username/password, OTP, token<br><br><b>Authorization</b> — verifying what access the user has: <i>what can they do?</i><br>Status code <b>403 Forbidden</b> — authenticated but access denied<br><br><b>Real example:</b> wrong password → 401. A normal user accessing the admin dashboard → 403." },
        { q: "How do you add authentication to a request?", a: "Using the <code>auth()</code> method:<br><br><b>Basic</b> — <code>.auth().basic(\"username\", \"password\")</code><br><b>Digest</b> — <code>.auth().digest(\"username\", \"password\")</code><br><b>OAuth 1.0</b> — <code>.auth().oauth(consumerKey, consumerSecret, token, tokenSecret)</code><br><b>OAuth 2.0</b> — <code>.auth().oauth2(\"your-access-token\")</code><br><b>Custom</b> — <code>.header(\"Authorization\", \"your-auth-header\")</code>" },
        { q: "Show Basic Auth and OAuth examples", a: "<b>Basic Auth:</b><pre>given()\n.auth()\n.basic(\"username\", \"password\")\n.baseUri(\"https://api-restassured.com\")\n.when()\n.get(\"/secure-endpoint\")\n.then()\n.statusCode(200);</pre><b>OAuth:</b><pre>given()\n.auth()\n.oauth2(\"accesstoken\")\n.baseUri(\"https://amazon.com\")\n.when()\n.get(\"/resource\")\n.then()\n.statusCode(200);</pre>The access token is obtained using the client secret and consumer key." },
        { q: "Why use OAuth 2.0?", a: "When two applications interact — e.g. logging into BookMyShow via a Google account. Google already holds the user information, so ticket details go to that Gmail user automatically.<br><br>Benefits:<br>· No data-breach headache for the application<br>· The application does not store user data — it is handled by the other application<br>· The two applications can communicate securely" },
        { q: "Are client id and client secret both public?", a: "Only the <b>client id</b> is public. The <b>client secret</b> is <b>not</b> public.<br><br>Example: BookMyShow interacting with Google gets a unique client id from Google." },
        { q: "What is scope in OAuth?", a: "What details the application needs from the owner whose data is being fetched — e.g. BookMyShow fetching user details from Google." },
        { q: "What is auth URL?", a: "The URL provided by the provider (e.g. Google) when you register your application." },
        { q: "What is client id?", a: "A unique identifier obtained when your application first registers/interacts with the other application." },
        { q: "What is response type?", a: "What we want back from the application — typically a <b>code</b>." },
        { q: "What is redirect URI?", a: "The URI that redirects us back to the page after retrieving details and getting authorization." },
        { q: "What is state in OAuth?", a: "An additional layer of security added when accessing the application after authorization (protects against CSRF)." },
        { q: "How many grant types are there in OAuth 2.0?", a: "The one commonly used here is <b>authorization_code</b>. Client id, client secret, redirect URI, scope and grant type are provided by the dev team.<br><br>Flow: get the client id (public, visible in the URL) → log in to the provider → the auth code appears in the URL." },
        { q: "How do you handle authentication and authorization in a RESTful API?", a: "Authentication via Basic, Digest, OAuth and similar methods. For authorization we pass the token values (typically a Bearer token in the Authorization header)." }
      ]
    },
    {
      topic: "Response Validation",
      questions: [
        { q: "How do you validate a response?", a: "Using <code>assertThat()</code> which supports path, jsonPath and xmlPath extraction.<pre>given()\n    .baseURI(\"https://api.example.com\")\n.when()\n    .get(\"/users/1\")\n.then()\n    .statusCode(200)\n    .body(\"name\", equalTo(\"John\"))\n    .header(\"Content-Type\", \"application/json\")\n    .time(lessThan(2000L));</pre>" },
        { q: "What do we validate in a response?", a: "Status code, headers, response body, response time, content type, JSON schema." },
        { q: "How do you validate specific fields in the JSON response body?", a: "<pre>given()\n.baseUri(\"https://amazon.com\")\n.when()\n.get(\"/orders/1\")\n.then()\n.assertThat()\n.statusCode(200)\n.body(\"orderid\", equalTo(43))\n.body(\"ordername\", equalTo(\"earphone\"));</pre>Or extract and assert:<pre>String res = given()\n.baseUri(\"https://amazon.com\")\n.when()\n.get(\"/orders/1\")\n.then().assertThat()\n.statusCode(200)\n.extract().response().asString();\n\nJsonPath jp = new JsonPath(res);\nString emailid = jp.getString(\"email\");\nassertEquals(emailid, \"anandsoni@test.com\");</pre>Hamcrest matchers like <code>equalToIgnoringCase</code> can also be used." },
        { q: "How do you validate the response headers?", a: "<pre>given()\n.baseUri(\"https://amazon.com\")\n.when()\n.get(\"/orders/1\")\n.then()\n.statusCode(200)\n.header(\"Content-Type\", equalTo(\"application/json\"))\n.header(\"Server\", equalTo(\"Apache\"));</pre>" },
        { q: "How do you validate response time?", a: "Using the <code>time()</code> method inside then():<pre>given()\n.when()\n    .get(\"/users\")\n.then()\n    .time(lessThan(2000L));  // under 2 seconds</pre>" },
        { q: "How do you get the status code from the response?", a: "<b>Using Response object:</b><pre>Response response = given()\n        .baseURI(url)\n.when()\n        .post(\"/maps/user\");\n\nint statusCode = response.getStatusCode();</pre><b>Using then() validation:</b><pre>given()\n.when()\n    .post(\"/maps/user\")\n.then()\n    .statusCode(200);</pre>" },
        { q: "What is JSON Schema Validation?", a: "Validates data types, required fields and field structure — ensures the API contract is not broken.<pre>given()\n.when()\n    .get(\"/users/1\")\n.then()\n    .assertThat()\n    .body(matchesJsonSchemaInClasspath(\"schema.json\"));</pre>" }
      ]
    },
    {
      topic: "Extracting Response",
      questions: [
        { q: "In how many ways can we extract the response?", a: "<b>1. asString()</b><pre>String body = response.getBody().asString();</pre><b>2. jsonPath()</b><pre>String name = response.jsonPath().getString(\"data[0].name\");</pre><b>3. as(ClassName.class) — POJO mapping</b><pre>User user = response.as(User.class);</pre><b>4. path()</b><pre>String name = response.path(\"data[0].name\");</pre>Also: xmlPath(), asInputStream(), asByteArray()." },
        { q: "Difference between extract() and asString()?", a: "<b>asString()</b> converts the <b>entire</b> response into a string — use when you want the full response.<pre>String body = response.asString();</pre><b>extract()</b> is used after validation inside then() to pull out <b>specific</b> values.<pre>String name =\n    given()\n    .when()\n        .get(\"/users/1\")\n    .then()\n        .statusCode(200)\n        .extract()\n        .path(\"name\");</pre>" },
        { q: "Show an example of API chaining", a: "Extract a value from one call and feed it into the next:<pre>String userId =\ngiven()\n    .body(\"payload\")\n.when()\n    .post(\"/users\")\n.then()\n    .extract()\n    .path(\"id\");\n\ngiven()\n    .pathParam(\"id\", userId)\n.when()\n    .get(\"/users/{id}\")\n.then()\n    .statusCode(200);</pre>" },
        { q: "When do we convert JSON data to string and when not?", a: "When using a <b>HashMap</b> we can use it directly. When using a <b>JSONObject</b> we have to convert the body with <code>.toString()</code>." }
      ]
    },
    {
      topic: "POJO, Serialization & Deserialization",
      questions: [
        { q: "What is a POJO class?", a: "POJO = <b>Plain Old Java Object</b>. A simple Java class containing:<br>· <b>Private</b> fields to store data<br>· <b>Public getters and setters</b> to access and modify fields<br>· Constructors<br>· <b>No special annotations</b> (@Entity, @Controller) binding it to a framework<br><br>POJO makes API validation cleaner and more structured than using raw JSON strings." },
        { q: "Write a POJO class example", a: "<pre>public class Employee {\n    private String name;\n    private int age;\n    private String department;\n\n    public Employee() {}\n\n    public Employee(String name, int age, String department) {\n        this.name = name;\n        this.age = age;\n        this.department = department;\n    }\n\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n\n    public int getAge() { return age; }\n    public void setAge(int age) { this.age = age; }\n\n    public String getDepartment() { return department; }\n    public void setDepartment(String d) { this.department = d; }\n}</pre>" },
        { q: "What is serialization and deserialization?", a: "<b>Serialization</b> → Java object to JSON<pre>User user = new User(\"Anand\", 30);\n\ngiven()\n    .contentType(\"application/json\")\n    .body(user)   // Java object converted to JSON\n.when()\n    .post(\"/users\");</pre><b>Deserialization</b> → JSON to Java object<pre>User user =\n    given()\n    .when()\n        .get(\"/users/1\")\n    .then()\n        .extract()\n        .as(User.class);</pre>Both improve readability and type safety in API automation." },
        { q: "Which library is used for POJO serialize and deserialize?", a: "<b>Jackson Databind</b><pre>&lt;dependency&gt;\n    &lt;groupId&gt;com.fasterxml.jackson.core&lt;/groupId&gt;\n    &lt;artifactId&gt;jackson-databind&lt;/artifactId&gt;\n    &lt;version&gt;2.15.2&lt;/version&gt;\n&lt;/dependency&gt;</pre>" },
        { q: "How do you map a nested array in a POJO?", a: "For this JSON:<pre>{\n    \"orders\": [\n        {\n        \"country\": \"India\",\n        \"productOrderedId\": \"{{productId}}\"\n        }\n    ]\n}</pre>Declare it as a List of the nested type:<pre>private List&lt;Orders&gt; orders;</pre>" }
      ]
    },
    {
      topic: "Status Codes",
      questions: [
        { q: "Explain the different status codes", a: "<b>200 OK</b> — request was successful<br><b>201 Created</b> — successful and a resource was created<br><b>204 No Content</b> — successful but nothing to return (e.g. deleting an image from a gallery)<br><b>301</b> — resource moved to another URL<br><b>400 Bad Request</b> — request could not be understood, missing params or wrong format<br><b>401 Unauthorized</b> — authentication required<br><b>403 Forbidden</b> — server understands but refuses to authorize<br><b>404 Not Found</b> — resource does not exist, moved or deleted<br><b>405 Method Not Allowed</b> — e.g. using PUT where GET is expected<br><b>408 Request Timeout</b> — server timed out waiting for the client request<br><b>500 Internal Server Error</b> — unexpected server condition<br><b>502 Bad Gateway</b> — invalid response from an upstream server<br><b>503 Service Unavailable</b> — temporary overload or maintenance<br><b>504 Gateway Timeout</b> — no timely response from an upstream server" },
        { q: "Explain 502 Bad Gateway with a real example", a: "Imagine a website hosted on multiple servers behind a load balancer:<br><br>1. The client sends a request to the load balancer<br>2. The load balancer forwards it to a backend server<br>3. That backend server is down, misconfigured or overloaded and responds invalidly (timeout or bad format)<br><br>The load balancer then returns <b>502 Bad Gateway</b> because it received a bad or incomplete response from the backend." },
        { q: "When do we get 400 Bad Request?", a: "· Placing an order with a deleted product id<br>· Trying to delete a product that does not exist<br>· Passing an incorrect date-of-birth format<br>· Missing required parameters — e.g. searching a flight without a destination" },
        { q: "How do you handle error responses in a RESTful API?", a: "<b>4xx series</b> — client-side errors<br><b>5xx series</b> — server-side errors" }
      ]
    },
    {
      topic: "Spec Builders & Reusability",
      questions: [
        { q: "What are RequestSpecBuilder and ResponseSpecBuilder?", a: "Utility classes for defining <b>reusable specifications</b> for HTTP requests and responses.<br><br><b>RequestSpecBuilder</b> — a common set of request settings (headers, query params, auth) reused across API calls:<pre>RequestSpecification requestSpec = new RequestSpecBuilder()\n    .setBaseUri(\"https://api.example.com\")\n    .setContentType(ContentType.JSON)\n    .addHeader(\"Authorization\", \"Bearer token\")\n    .build();</pre><b>ResponseSpecBuilder</b> — reusable response expectations:<pre>ResponseSpecification responseSpec = new ResponseSpecBuilder()\n    .expectStatusCode(200)\n    .expectContentType(ContentType.JSON)\n    .build();</pre><b>Usage:</b><pre>given().spec(requestSpec)\n       .when().get(\"/endpoint\")\n       .then().spec(responseSpec);</pre>" },
        { q: "Explain the log() method in Rest Assured", a: "<code>.log().all()</code> — logs everything<br><code>.log().body()</code> — logs only the body<br><code>.log().headers()</code> — logs only headers<br><code>.log().params()</code> — logs parameters<br><br>Logging is mostly used during debugging and can be conditionally enabled — use <code>.log().ifValidationFails()</code> to log only when a test fails." }
      ]
    },
    {
      topic: "Data Driven & Framework",
      questions: [
        { q: "How do you do data driven testing in Rest Assured?", a: "Pass the data using the <b>Examples</b> keyword (Cucumber Scenario Outline) so it is picked up at runtime." },
        { q: "With multiple data sets, the log only shows the last set — how do you see all runs?", a: "Make the RequestSpecification <b>public static</b> and guard it with a null check, so the spec is built once and the log stream is not overwritten on each iteration.<pre>public static RequestSpecification Req;\n\npublic RequestSpecification requestSpec() throws Exception {\n    if (Req == null) {\n        PrintStream log = new PrintStream(\n            new FileOutputStream(\"logging.txt\"));\n        Req = new RequestSpecBuilder()\n            .setBaseUri(getGlobalValue(\"baseURI\"))\n            .addQueryParam(\"key\", \"qaclick123\")\n            .addFilter(RequestLoggingFilter.logRequestTo(log))\n            .addFilter(ResponseLoggingFilter.logResponseTo(log))\n            .setContentType(ContentType.JSON)\n            .build();\n        return Req;\n    }\n    return Req;\n}</pre>" },
        { q: "What is enum?", a: "A special class in Java holding a collection of constants (and optionally methods)." },
        { q: "What is the use of the static keyword here?", a: "A static variable is declared at class level and shared across all test cases — not just one. It will not become null between tests." },
        { q: "How do you call a static variable?", a: "With the <b>class name</b>, not the object name." },
        { q: "How do you handle numerical values in Excel?", a: "Use the <code>NumberToTextConverter</code> method to convert numeric cell values to text." }
      ]
    },
    {
      topic: "Maven Commands",
      questions: [
        { q: "What does mvn compile do?", a: "Only compiles the code — it does not run any test cases." },
        { q: "What does mvn test do?", a: "Compiles and executes the tests." },
        { q: "How to run tests for a particular tag using mvn?", a: "<pre>mvn test -Dcucumber.options=\"--tags @AddPlace\"</pre><code>-D</code> stands for parameter." },
        { q: "How to generate the report from the command prompt?", a: "<code>mvn test verify</code>" }
      ]
    },
    {
      topic: "Leadership & Process",
      questions: [
        { q: "How would you contribute to the team as a lead?", a: "First understand the project architecture, existing framework and team structure. Then:<br><br>· Understand current automation coverage and gaps<br>· Identify flaky tests and improve stability<br>· Standardize coding practices and review code<br>· Guide the team on best automation strategies<br>· Ensure CI/CD integration and reporting<br>· Mentor junior team members<br>· Communicate effectively with stakeholders" }
      ]
    }
  ]
};
