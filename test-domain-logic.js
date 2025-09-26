// Test script for domain blocking logic
function normalizeDomain(url) {
  try {
    // Add protocol if missing for URL constructor
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function testDomainBlocking(testUrl, rejectedDomains) {
  const domain = normalizeDomain(testUrl);
  if (!domain) {
    console.log("❌ Invalid test URL:", testUrl);
    return;
  }

  console.log("🧪 Testing domain blocking for:", domain);
  console.log("📋 Current rejected domains:", rejectedDomains);

  if (!rejectedDomains || rejectedDomains.length === 0) {
    console.log("ℹ️ No rejected domains configured");
    return;
  }

  for (const pat of rejectedDomains) {
    // More precise matching: exact match or subdomain match
    const isMatch = domain === pat ||
                   (domain.endsWith('.' + pat) && domain !== pat);

    if (isMatch) {
      console.log(`🚫 Domain ${domain} WOULD BE BLOCKED by pattern: ${pat}`);
      return;
    }
  }

  console.log(`✅ Domain ${domain} would be ALLOWED`);
}

// Test cases
console.log("=== Domain Blocking Logic Tests ===\n");

// Test 1: Exact match
console.log("Test 1: Exact match");
testDomainBlocking("youtube.com", ["youtube.com", "facebook.com"]);
console.log();

// Test 2: Subdomain match
console.log("Test 2: Subdomain match");
testDomainBlocking("www.youtube.com", ["youtube.com"]);
console.log();

// Test 3: Subdomain blocking
console.log("Test 3: Subdomain blocking");
testDomainBlocking("music.youtube.com", ["youtube.com"]);
console.log();

// Test 4: No match
console.log("Test 4: No match");
testDomainBlocking("github.com", ["youtube.com", "facebook.com"]);
console.log();

// Test 5: Complex domain patterns
console.log("Test 5: Complex domain patterns");
testDomainBlocking("app.slack.com", ["slack.com"]);
console.log();

// Test 6: Multiple patterns
console.log("Test 6: Multiple patterns");
testDomainBlocking("youtube.com", ["google.com", "youtube.com", "facebook.com"]);
console.log();

// Test 7: Edge case - empty rejected domains
console.log("Test 7: Empty rejected domains");
testDomainBlocking("youtube.com", []);
console.log();

// Test 8: Invalid URL
console.log("Test 8: Invalid URL");
testDomainBlocking("not-a-url", ["youtube.com"]);
console.log();

console.log("=== Tests Complete ===");
