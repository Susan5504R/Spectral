const { initDb, sequelize, Problem, TestCase, Topic } = require('./db');

async function seed() {
    try {
        console.log("Seeding ALL 20 Problems with genuine Brute/Better/Optimal Hints, 5 Testcases (2 Public, 3 Hidden), and 4-Language Editorials...");
        await initDb({ logPrefix: "SEED_PROBLEMS" });
        await TestCase.destroy({ where: {}, truncate: { cascade: true } });
        await Problem.destroy({ where: {}, truncate: { cascade: true } });
        await Topic.destroy({ where: {}, truncate: { cascade: true } });

        const topicsData = ["Arrays", "Strings", "Math", "Recursion", "DP", "Binary Search", "Graphs", "Bit Manipulation", "Backtracking"];
        const topics = {};
        for (const name of topicsData) {
            const [topic] = await Topic.findOrCreate({ where: { name } });
            topics[name] = topic;
        }

        const problems = [
            // ── EASY PROBLEMS (8) ───────────────────────────────────────────
            {
                title: "Two Sum",
                difficulty: "Easy",
                topic: "Arrays",
                description: "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
                constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
                editorialDescription: "Use a Hash Map to store values and their indices. For each element `x`, check if `target - x` exists in the hash map. This achieves O(n) time complexity.",
                hints: [
                    "⚡ Brute Force: Use nested loops to check all pairs (i, j) where i != j and see if nums[i] + nums[j] == target. Time complexity: O(N²), Space: O(1).",
                    "💡 Better Insight: Can we trade space for time? Sort the array while preserving original indices, then use Two Pointers from both ends. Time complexity: O(N log N), Space: O(N).",
                    "🚀 Optimal Solution: Iterate through the array once while maintaining a Hash Map of {value: index}. For each element x, check if (target - x) exists in the map in O(1) time. Time complexity: O(N), Space: O(N)."
                ],
                editorialSolutions: {
                    python: "import sys\ndata = sys.stdin.read().split()\nif data:\n    target = int(data[0])\n    nums = [int(x) for x in data[1:]]\n    m = {}\n    for i, n in enumerate(nums):\n        if target - n in m:\n            print(f\"{m[target - n]} {i}\")\n            sys.exit(0)\n        m[n] = i",
                    cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    int target;\n    if (cin >> target) {\n        vector<int> nums;\n        int val;\n        while (cin >> val) nums.push_back(val);\n        unordered_map<int, int> m;\n        for (int i = 0; i < nums.size(); i++) {\n            if (m.count(target - nums[i])) {\n                cout << m[target - nums[i]] << \" \" << i;\n                return 0;\n            }\n            m[nums[i]] = i;\n        }\n    }\n    return 0;\n}",
                    java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int target = sc.nextInt();\n            List<Integer> nums = new ArrayList<>();\n            while (sc.hasNextInt()) nums.add(sc.nextInt());\n            Map<Integer, Integer> map = new HashMap<>();\n            for (int i = 0; i < nums.size(); i++) {\n                int n = nums.get(i);\n                if (map.containsKey(target - n)) {\n                    System.out.println(map.get(target - n) + \" \" + i);\n                    return;\n                }\n                map.put(n, i);\n            }\n        }\n    }\n}",
                    c: "#include <stdio.h>\n\nint main() {\n    int target;\n    if (scanf(\"%d\", &target) == 1) {\n        int nums[1000], n = 0;\n        while (scanf(\"%d\", &nums[n]) == 1) n++;\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (nums[i] + nums[j] == target) {\n                    printf(\"%d %d\", i, j);\n                    return 0;\n                }\n            }\n        }\n    }\n    return 0;\n}"
                },
                cases: [
                    ["9\n2 7 11 15", "0 1", false],
                    ["6\n3 2 4", "1 2", false],
                    ["6\n3 3", "0 1", true],
                    ["10\n1 9 5", "0 1", true],
                    ["0\n-1 1 4", "0 1", true]
                ]
            },
            {
                title: "Palindrome Number",
                difficulty: "Easy",
                topic: "Math",
                description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.",
                constraints: "-2^31 <= x <= 2^31 - 1",
                editorialDescription: "Negative numbers are never palindromes. Reverse the lower half of the integer and compare it with the upper half to avoid overflow.",
                hints: [
                    "⚡ Brute Force: Convert the integer x to a string and check if the string reads the same forwards and backwards. Note: negative numbers are never palindromes. Time complexity: O(N), Space: O(N).",
                    "💡 Better Insight: Reverse the full integer mathematically using modulo (% 10) and division (/ 10) operations in a loop, then check if original == reversed. Watch out for integer overflow! Time complexity: O(log10 X), Space: O(1).",
                    "🚀 Optimal Solution: Revert only the lower half of the integer! Stop when x <= reversedHalf. Compare x == reversedHalf (even length) or x == reversedHalf / 10 (odd length). Time complexity: O(log10 X), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nx = int(sys.stdin.read().strip())\nif x < 0:\n    print('false')\nelse:\n    s = str(x)\n    print('true' if s == s[::-1] else 'false')",
                    cpp: "#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int x; cin >> x;\n    if (x < 0) { cout << \"false\"; return 0; }\n    string s = to_string(x), r = s;\n    reverse(r.begin(), r.end());\n    cout << (s == r ? \"true\" : \"false\");\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int x = sc.nextInt();\n        if (x < 0) { System.out.println(\"false\"); return; }\n        String s = String.valueOf(x);\n        System.out.println(s.equals(new StringBuilder(s).reverse().toString()) ? \"true\" : \"false\");\n    }\n}",
                    c: "#include <stdio.h>\n#include <string.h>\nint main() {\n    int x; scanf(\"%d\", &x);\n    if (x < 0) { printf(\"false\"); return 0; }\n    char s[20]; sprintf(s, \"%d\", x);\n    int len = strlen(s), ok = 1;\n    for (int i = 0; i < len / 2; i++) {\n        if (s[i] != s[len - 1 - i]) { ok = 0; break; }\n    }\n    printf(\"%s\", ok ? \"true\" : \"false\");\n    return 0;\n}"
                },
                cases: [
                    ["121", "true", false],
                    ["-121", "false", false],
                    ["10", "false", true],
                    ["12321", "true", true],
                    ["0", "true", true]
                ]
            },
            {
                title: "Reverse String",
                difficulty: "Easy",
                topic: "Strings",
                description: "Write a program that takes an input string and outputs the reversed string.",
                constraints: "1 <= s.length <= 10^5",
                editorialDescription: "Use two pointers starting at opposite ends of the string and swap characters moving inward.",
                hints: [
                    "⚡ Brute Force: Allocate a new character array of the same length, iterate from right to left through the original string, and copy characters over. Time complexity: O(N), Space: O(N).",
                    "💡 Better Insight: Use a recursive approach that swaps the first and last elements of substring s[left...right] and recurses inward on s[left+1...right-1]. Time complexity: O(N), Space: O(N) call stack.",
                    "🚀 Optimal Solution: Use an in-place Two Pointer approach. Place left pointer at 0 and right pointer at length - 1. Swap characters and move pointers inward until left >= right. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nprint(sys.stdin.read().strip()[::-1])",
                    cpp: "#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; cin >> s;\n    reverse(s.begin(), s.end());\n    cout << s;\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) System.out.println(new StringBuilder(sc.next()).reverse().toString());\n    }\n}",
                    c: "#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[1000];\n    if (scanf(\"%s\", s) == 1) {\n        int len = strlen(s);\n        for (int i = len - 1; i >= 0; i--) putchar(s[i]);\n    }\n    return 0;\n}"
                },
                cases: [
                    ["hello", "olleh", false],
                    ["world", "dlrow", false],
                    ["Spectral", "lartcepS", true],
                    ["a", "a", true],
                    ["code", "edoc", true]
                ]
            },
            {
                title: "Fibonacci Number",
                difficulty: "Easy",
                topic: "Recursion",
                description: "Calculate F(n) for a given `n`, where F(n) = F(n-1) + F(n-2), F(0)=0, F(1)=1.",
                constraints: "0 <= n <= 30",
                editorialDescription: "Iterative dynamic programming achieves O(n) time and O(1) space complexity by maintaining two variables for preceding states.",
                hints: [
                    "⚡ Brute Force: Use plain recursion matching the definition F(n) = F(n-1) + F(n-2) with base cases F(0)=0 and F(1)=1. Time complexity: O(2ⁿ), Space: O(N) call stack.",
                    "💡 Better Insight: Use Top-Down Memoization or a DP array of size N+1 to cache computed Fibonacci values so each subproblem is calculated only once. Time complexity: O(N), Space: O(N).",
                    "🚀 Optimal Solution: To calculate F(n), you only need the previous two terms F(n-1) and F(n-2). Maintain two rolling variables prev and curr, updating them in a loop. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nn = int(sys.stdin.read().strip())\na, b = 0, 1\nfor _ in range(n):\n    a, b = b, a + b\nprint(a)",
                    cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    int a = 0, b = 1;\n    while (n--) { int temp = a + b; a = b; b = temp; }\n    cout << a;\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int a = 0, b = 1;\n        while (n-- > 0) { int t = a + b; a = b; b = t; }\n        System.out.println(a);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int n; if (scanf(\"%d\", &n) == 1) {\n        int a = 0, b = 1;\n        while (n--) { int t = a + b; a = b; b = t; }\n        printf(\"%d\", a);\n    }\n    return 0;\n}"
                },
                cases: [
                    ["2", "1", false],
                    ["3", "2", false],
                    ["0", "0", true],
                    ["1", "1", true],
                    ["10", "55", true]
                ]
            },
            {
                title: "Binary Search",
                difficulty: "Easy",
                topic: "Binary Search",
                description: "Given a sorted array of integers `nums` and an integer `target`, return the index of `target`. If not found, return `-1`.",
                constraints: "1 <= nums.length <= 10^4",
                editorialDescription: "Maintain `left` and `right` pointers. Calculate `mid = left + (right - left) / 2` and narrow search space exponentially in O(log n) time.",
                hints: [
                    "⚡ Brute Force: Scan through the array linearly from index 0 to N-1, checking each element against target. Time complexity: O(N), Space: O(1).",
                    "💡 Better Insight: The input array is sorted. Use Divide and Conquer recursion to check target against the midpoint and recurse on either the left or right half. Time complexity: O(log N), Space: O(log N).",
                    "🚀 Optimal Solution: Use an iterative Two Pointer Binary Search with left = 0 and right = N - 1. Calculate mid = left + (right - left) / 2 to avoid integer overflow, and adjust boundaries. Time complexity: O(log N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nlines = sys.stdin.read().splitlines()\ntarget = int(lines[0])\nnums = list(map(int, lines[1].split()))\nl, r = 0, len(nums) - 1\nans = -1\nwhile l <= r:\n    m = (l + r) // 2\n    if nums[m] == target:\n        ans = m; break\n    elif nums[m] < target: l = m + 1\n    else: r = m - 1\nprint(ans)",
                    cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int target; if (!(cin >> target)) return 0;\n    vector<int> nums;\n    int val;\n    while (cin >> val) nums.push_back(val);\n    int l = 0, r = nums.size() - 1, ans = -1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) { ans = m; break; }\n        else if (nums[m] < target) l = m + 1;\n        else r = m - 1;\n    }\n    cout << ans;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int target = sc.nextInt();\n        List<Integer> list = new ArrayList<>();\n        while (sc.hasNextInt()) list.add(sc.nextInt());\n        int l = 0, r = list.size() - 1, ans = -1;\n        while (l <= r) {\n            int m = l + (r - l) / 2;\n            if (list.get(m) == target) { ans = m; break; }\n            else if (list.get(m) < target) l = m + 1;\n            else r = m - 1;\n        }\n        System.out.println(ans);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int target, arr[1000], n = 0;\n    if (scanf(\"%d\", &target) != 1) return 0;\n    while (scanf(\"%d\", &arr[n]) == 1) n++;\n    int l = 0, r = n - 1, ans = -1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (arr[m] == target) { ans = m; break; }\n        else if (arr[m] < target) l = m + 1;\n        else r = m - 1;\n    }\n    printf(\"%d\", ans);\n    return 0;\n}"
                },
                cases: [
                    ["9\n1 9", "1", false],
                    ["2\n1 3", "-1", false],
                    ["5\n5", "0", true],
                    ["1\n1", "0", true],
                    ["10\n1 2 10", "2", true]
                ]
            },
            {
                title: "Valid Parentheses",
                difficulty: "Easy",
                topic: "Strings",
                description: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                constraints: "1 <= s.length <= 10^4",
                editorialDescription: "Use a stack. Push opening brackets and pop matching closing brackets. The string is valid if the stack is empty at the end.",
                hints: [
                    "⚡ Brute Force: Repeatedly replace adjacent matching bracket pairs '()', '{}', '[]' with empty strings until no more replacements occur. If string is empty, it's valid. Time complexity: O(N²), Space: O(N).",
                    "💡 Better Insight: Counting open/close bracket types works for simple strings, but fails for mismatched nesting like '([)]'. You need a Last-In, First-Out structure to match the most recent opening bracket.",
                    "🚀 Optimal Solution: Use a Stack. Iterate through the string; push opening brackets onto the stack. For a closing bracket, pop from the stack and verify it matches the bracket type. Finally, verify stack is empty. Time complexity: O(N), Space: O(N)."
                ],
                editorialSolutions: {
                    python: "import sys\ns = sys.stdin.read().strip()\nst = []\nm = {')': '(', '}': '{', ']': '['}\nvalid = True\nfor c in s:\n    if c in m.values(): st.append(c)\n    elif c in m:\n        if not st or st.pop() != m[c]: valid = False; break\nif st: valid = False\nprint('true' if valid else 'false')",
                    cpp: "#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\nint main() {\n    string s; if (!(cin >> s)) return 0;\n    stack<char> st;\n    bool ok = true;\n    for (char c : s) {\n        if (c == '(' || c == '{' || c == '[') st.push(c);\n        else {\n            if (st.empty()) { ok = false; break; }\n            char top = st.top(); st.pop();\n            if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) { ok = false; break; }\n        }\n    }\n    if (!st.empty()) ok = false;\n    cout << (ok ? \"true\" : \"false\");\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        Stack<Character> st = new Stack<>();\n        boolean ok = true;\n        for (char c : s.toCharArray()) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.isEmpty()) { ok = false; break; }\n                char top = st.pop();\n                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) { ok = false; break; }\n            }\n        }\n        if (!st.isEmpty()) ok = false;\n        System.out.println(ok ? \"true\" : \"false\");\n    }\n}",
                    c: "#include <stdio.h>\n#include <stdbool.h>\n#include <string.h>\nint main() {\n    char s[1000]; if (scanf(\"%s\", s) != 1) return 0;\n    char st[1000]; int top = 0; bool ok = true;\n    for (int i = 0; s[i]; i++) {\n        char c = s[i];\n        if (c == '(' || c == '{' || c == '[') st[top++] = c;\n        else {\n            if (top == 0) { ok = false; break; }\n            char t = st[--top];\n            if ((c == ')' && t != '(') || (c == '}' && t != '{') || (c == ']' && t != '[')) { ok = false; break; }\n        }\n    }\n    if (top > 0) ok = false;\n    printf(\"%s\", ok ? \"true\" : \"false\");\n    return 0;\n}"
                },
                cases: [
                    ["()", "true", false],
                    ["()[]{}", "true", false],
                    ["(]", "false", true],
                    ["([)]", "false", true],
                    ["{[]}", "true", true]
                ]
            },
            {
                title: "Single Number",
                difficulty: "Easy",
                topic: "Bit Manipulation",
                description: "Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.",
                constraints: "1 <= nums.length <= 3 * 10^4",
                editorialDescription: "XORing a number with itself yields 0. XORing all elements together cancels duplicates, leaving the single unique number.",
                hints: [
                    "⚡ Brute Force: For every element in the array, run a second loop to count its total occurrences. The number with count equal to 1 is the answer. Time complexity: O(N²), Space: O(1).",
                    "💡 Better Insight: Use a Hash Map / Frequency Map to count numbers, or a HashSet where you add on first sight and remove on second sight. The remaining element in the set is the answer. Time complexity: O(N), Space: O(N).",
                    "🚀 Optimal Solution: Use Bitwise XOR (^). Note that x ^ x = 0 and x ^ 0 = x. XORing all elements together cancels out every pair appearing twice, leaving only the single number! Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nnums = list(map(int, sys.stdin.read().split()))\nans = 0\nfor n in nums: ans ^= n\nprint(ans)",
                    cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int val, ans = 0;\n    while (cin >> val) ans ^= val;\n    cout << ans;\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int ans = 0;\n        while (sc.hasNextInt()) ans ^= sc.nextInt();\n        System.out.println(ans);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int val, ans = 0;\n    while (scanf(\"%d\", &val) == 1) ans ^= val;\n    printf(\"%d\", ans);\n    return 0;\n}"
                },
                cases: [
                    ["2 2 1", "1", false],
                    ["4 1 2 1 2", "4", false],
                    ["1", "1", true],
                    ["7 3 3", "7", true],
                    ["5 5 10", "10", true]
                ]
            },
            {
                title: "FizzBuzz",
                difficulty: "Easy",
                topic: "Math",
                description: "Given an integer `n`, return a string array where:\n- `FizzBuzz` if `i` is divisible by 3 and 5.\n- `Fizz` if `i` is divisible by 3.\n- `Buzz` if `i` is divisible by 5.\n- `i` otherwise.",
                constraints: "1 <= n <= 10^4",
                editorialDescription: "Iterate from 1 to n and evaluate modulo conditions in order of specificity.",
                hints: [
                    "⚡ Brute Force: For each integer i from 1 to N, check each condition separately: first i % 3 == 0 && i % 5 == 0, then i % 3 == 0, then i % 5 == 0, else convert i to string. Time complexity: O(N), Space: O(1).",
                    "💡 Better Insight: Evaluate modulo conditions in hierarchical order. Notice i % 15 == 0 checks both 3 and 5, followed by i % 3 and i % 5 to minimize mod operations.",
                    "🚀 Optimal Solution: String Concatenation! For each i, initialize an empty string. If i % 3 == 0 append 'Fizz', if i % 5 == 0 append 'Buzz'. If empty, convert i to string. Easily scales to extra divisors. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nn = int(sys.stdin.read().strip())\nfor i in range(1, n + 1):\n    if i % 15 == 0: print('FizzBuzz')\n    elif i % 3 == 0: print('Fizz')\n    elif i % 5 == 0: print('Buzz')\n    else: print(i)",
                    cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) cout << \"FizzBuzz\\n\";\n        else if (i % 3 == 0) cout << \"Fizz\\n\";\n        else if (i % 5 == 0) cout << \"Buzz\\n\";\n        else cout << i << \"\\n\";\n    }\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        for (int i = 1; i <= n; i++) {\n            if (i % 15 == 0) System.out.println(\"FizzBuzz\");\n            else if (i % 3 == 0) System.out.println(\"Fizz\");\n            else if (i % 5 == 0) System.out.println(\"Buzz\");\n            else System.out.println(i);\n        }\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int n; scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) printf(\"FizzBuzz\\n\");\n        else if (i % 3 == 0) printf(\"Fizz\\n\");\n        else if (i % 5 == 0) printf(\"Buzz\\n\");\n        else printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
                },
                cases: [
                    ["3", "1\n2\nFizz", false],
                    ["5", "1\n2\nFizz\n4\nBuzz", false],
                    ["1", "1", true],
                    ["15", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", true],
                    ["6", "1\n2\nFizz\n4\nBuzz\nFizz", true]
                ]
            },

            // ── MEDIUM PROBLEMS (6) ──────────────────────────────────────────
            {
                title: "Climbing Stairs",
                difficulty: "Medium",
                topic: "DP",
                description: "You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you reach the top?",
                constraints: "1 <= n <= 45",
                editorialDescription: "This problem is isomorphic to Fibonacci: `ways(n) = ways(n-1) + ways(n-2)`. Solve using DP in O(n) time.",
                hints: [
                    "⚡ Brute Force: Use naive recursion: climb(n) = climb(n-1) + climb(n-2) with base cases climb(1)=1, climb(2)=2. Time complexity: O(2ⁿ), Space: O(N) recursion tree.",
                    "💡 Better Insight: Store subproblem answers in a dp array of size N+1 where dp[i] = dp[i-1] + dp[i-2] to avoid recomputing visited steps. Time complexity: O(N), Space: O(N).",
                    "🚀 Optimal Solution: Notice to reach step N, you only need ways for N-1 and N-2. Maintain two integer variables for rolling states and update iteratively in a loop. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nn = int(sys.stdin.read().strip())\na, b = 1, 1\nfor _ in range(n - 1):\n    a, b = b, a + b\nprint(b)",
                    cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    int a = 1, b = 1;\n    for (int i = 0; i < n - 1; i++) { int t = a + b; a = b; b = t; }\n    cout << b;\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int a = 1, b = 1;\n        for (int i = 0; i < n - 1; i++) { int t = a + b; a = b; b = t; }\n        System.out.println(b);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int n; scanf(\"%d\", &n);\n    int a = 1, b = 1;\n    for (int i = 0; i < n - 1; i++) { int t = a + b; a = b; b = t; }\n    printf(\"%d\", b);\n    return 0;\n}"
                },
                cases: [
                    ["2", "2", false],
                    ["3", "3", false],
                    ["4", "5", true],
                    ["5", "8", true],
                    ["10", "89", true]
                ]
            },
            {
                title: "Max Subarray",
                difficulty: "Medium",
                topic: "DP",
                description: "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
                constraints: "1 <= nums.length <= 10^5",
                editorialDescription: "Use Kadane's Algorithm: maintain `currentMax = max(nums[i], currentMax + nums[i])` and update global max.",
                hints: [
                    "⚡ Brute Force: Generate all possible contiguous subarrays using two nested loops i (start) and j (end). Compute sum of elements from i to j and track global maximum. Time complexity: O(N²), Space: O(1).",
                    "💡 Better Insight: Use Divide and Conquer! Split array into left and right halves. The max subarray is either entirely in left half, entirely in right half, or crosses the midpoint. Time complexity: O(N log N), Space: O(log N).",
                    "🚀 Optimal Solution: Kadane's Algorithm (DP). Maintain currentMax = max(nums[i], currentMax + nums[i]) and update globalMax. If currentMax becomes negative, reset it by picking nums[i]. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nnums = list(map(int, sys.stdin.read().split()))\ncurr = glob = nums[0]\nfor x in nums[1:]:\n    curr = max(x, curr + x)\n    glob = max(glob, curr)\nprint(glob)",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int val; if (!(cin >> val)) return 0;\n    int curr = val, glob = val;\n    while (cin >> val) {\n        curr = max(val, curr + val);\n        glob = max(glob, curr);\n    }\n    cout << glob;\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int curr = sc.nextInt(), glob = curr;\n        while (sc.hasNextInt()) {\n            int val = sc.nextInt();\n            curr = Math.max(val, curr + val);\n            glob = Math.max(glob, curr);\n        }\n        System.out.println(glob);\n    }\n}",
                    c: "#include <stdio.h>\n#define MAX(a,b) ((a)>(b)?(a):(b))\nint main() {\n    int val; if (scanf(\"%d\", &val) != 1) return 0;\n    int curr = val, glob = val;\n    while (scanf(\"%d\", &val) == 1) {\n        curr = MAX(val, curr + val);\n        glob = MAX(glob, curr);\n    }\n    printf(\"%d\", glob);\n    return 0;\n}"
                },
                cases: [
                    ["-2 1 -3 4 -1 2 1 -5 4", "6", false],
                    ["1", "1", false],
                    ["5 4 -1 7 8", "23", true],
                    ["-1 -2 -3", "-1", true],
                    ["0 0 0", "0", true]
                ]
            },
            {
                title: "Sum of Two Integers",
                difficulty: "Medium",
                topic: "Bit Manipulation",
                description: "Given two integers `a` and `b`, return the sum of the two integers without using the operators `+` and `-`.",
                constraints: "-1000 <= a, b <= 1000",
                editorialDescription: "Use bitwise XOR for addition without carry (`a ^ b`) and bitwise AND shifted left by 1 for the carry (`(a & b) << 1`). Repeat until carry is 0.",
                hints: [
                    "⚡ Brute Force: Increment a by 1, b times in a loop, or build lists of size a and b and concatenate. Fails for negative numbers. Time complexity: O(|b|), Space: O(1).",
                    "💡 Better Insight: Simulate a full-adder logic circuit bit-by-bit from bit 0 to bit 31 using bitwise operations and tracking carry across iterations. Time complexity: O(1), Space: O(1).",
                    "🚀 Optimal Solution: Use Bitwise XOR (a ^ b) for addition without carry, and Bitwise AND shifted left ((a & b) << 1) for carry. Repeat loop until carry becomes 0. Time complexity: O(1), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nvals = list(map(int, sys.stdin.read().split()))\na, b = vals[0], vals[1]\nmask = 0xFFFFFFFF\nwhile b != 0:\n    a, b = (a ^ b) & mask, ((a & b) << 1) & mask\nans = a if a <= 0x7FFFFFFF else ~(a ^ mask)\nprint(ans)",
                    cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b; if (cin >> a >> b) {\n        while (b != 0) {\n            unsigned carry = (unsigned)(a & b) << 1;\n            a = a ^ b;\n            b = carry;\n        }\n        cout << a;\n    }\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt(), b = sc.nextInt();\n        while (b != 0) {\n            int carry = (a & b) << 1;\n            a = a ^ b;\n            b = carry;\n        }\n        System.out.println(a);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int a, b; if (scanf(\"%d %d\", &a, &b) == 2) {\n        while (b != 0) {\n            unsigned carry = (unsigned)(a & b) << 1;\n            a = a ^ b;\n            b = carry;\n        }\n        printf(\"%d\", a);\n    }\n    return 0;\n}"
                },
                cases: [
                    ["1 2", "3", false],
                    ["2 3", "5", false],
                    ["-1 1", "0", true],
                    ["10 20", "30", true],
                    ["-5 -5", "-10", true]
                ]
            },
            {
                title: "Container With Most Water",
                difficulty: "Medium",
                topic: "Arrays",
                description: "Given `n` non-negative integers representing heights of vertical lines, find two lines that together with the x-axis forms a container that holds the most water.",
                constraints: "2 <= n <= 10^5",
                editorialDescription: "Use Two Pointers starting at index 0 and `n-1`. Calculate area `min(h[l], h[r]) * (r - l)` and move the pointer pointing to the shorter line.",
                hints: [
                    "⚡ Brute Force: Test every pair of vertical lines (i, j) where i < j. Calculate area min(height[i], height[j]) * (j - i) and track maximum area. Time complexity: O(N²), Space: O(1).",
                    "💡 Better Insight: Sorting lines destroys index distances (j - i), so sorting won't work. Consider starting with maximum width and shrinking boundaries.",
                    "🚀 Optimal Solution: Use Two Pointers at extreme ends (left = 0, right = N - 1). Compute area, then move the pointer pointing to the shorter line inward, as moving the taller line can never yield a larger area. Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nh = list(map(int, sys.stdin.read().split()))\nl, r, maxa = 0, len(h) - 1, 0\nwhile l < r:\n    maxa = max(maxa, min(h[l], h[r]) * (r - l))\n    if h[l] < h[r]: l += 1\n    else: r -= 1\nprint(maxa)",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<int> h; int val;\n    while (cin >> val) h.push_back(val);\n    int l = 0, r = h.size() - 1, maxa = 0;\n    while (l < r) {\n        maxa = max(maxa, min(h[l], h[r]) * (r - l));\n        if (h[l] < h[r]) l++; else r--;\n    }\n    cout << maxa;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<Integer> h = new ArrayList<>();\n        while (sc.hasNextInt()) h.add(sc.nextInt());\n        int l = 0, r = h.size() - 1, maxa = 0;\n        while (l < r) {\n            maxa = Math.max(maxa, Math.min(h.get(l), h.get(r)) * (r - l));\n            if (h.get(l) < h.get(r)) l++; else r--;\n        }\n        System.out.println(maxa);\n    }\n}",
                    c: "#include <stdio.h>\n#define MIN(a,b) ((a)<(b)?(a):(b))\n#define MAX(a,b) ((a)>(b)?(a):(b))\nint main() {\n    int h[1000], n = 0;\n    while (scanf(\"%d\", &h[n]) == 1) n++;\n    int l = 0, r = n - 1, maxa = 0;\n    while (l < r) {\n        maxa = MAX(maxa, MIN(h[l], h[r]) * (r - l));\n        if (h[l] < h[r]) l++; else r--;\n    }\n    printf(\"%d\", maxa);\n    return 0;\n}"
                },
                cases: [
                    ["1 8 6 2 5 4 8 3 7", "49", false],
                    ["1 1", "1", false],
                    ["4 3 2 1 4", "16", true],
                    ["1 2 1", "2", true],
                    ["5 5 5 5", "15", true]
                ]
            },
            {
                title: "3Sum",
                difficulty: "Medium",
                topic: "Arrays",
                description: "Given an integer array `nums`, return all unique triplets `[nums[i], nums[j], nums[k]]` such that `nums[i] + nums[j] + nums[k] == 0`.",
                constraints: "3 <= nums.length <= 3000",
                editorialDescription: "Sort the array. Fix the first element `nums[i]` and use Two Pointers (`left = i+1`, `right = n-1`) to find zero sum pairs while skipping duplicate values.",
                hints: [
                    "⚡ Brute Force: Use three nested loops (i, j, k) to test all triplets where nums[i] + nums[j] + nums[k] == 0. Insert sorted triplets into a Set to avoid duplicates. Time complexity: O(N³), Space: O(N).",
                    "💡 Better Insight: Fix the first element nums[i] with a loop, then for each i, use a Hash Map on the remaining elements to solve Two Sum for target -nums[i]. Time complexity: O(N²), Space: O(N).",
                    "🚀 Optimal Solution: Sort the array first. Fix nums[i] and use Two Pointers (left = i + 1, right = N - 1) to find zero sum pairs. Skip duplicate values for i, left, and right to avoid set overhead. Time complexity: O(N²), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nnums = sorted(list(map(int, sys.stdin.read().split())))\nres = []\nfor i in range(len(nums) - 2):\n    if i > 0 and nums[i] == nums[i-1]: continue\n    l, r = i + 1, len(nums) - 1\n    while l < r:\n        s = nums[i] + nums[l] + nums[r]\n        if s == 0:\n            res.append(f'{nums[i]} {nums[l]} {nums[r]}')\n            l += 1; r -= 1\n            while l < r and nums[l] == nums[l-1]: l += 1\n        elif s < 0: l += 1\n        else: r -= 1\nprint('\\n'.join(res) if res else 'None')",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<int> nums; int val;\n    while (cin >> val) nums.push_back(val);\n    sort(nums.begin(), nums.end());\n    bool found = false;\n    for (int i = 0; i < (int)nums.size() - 2; i++) {\n        if (i > 0 && nums[i] == nums[i-1]) continue;\n        int l = i + 1, r = nums.size() - 1;\n        while (l < r) {\n            int s = nums[i] + nums[l] + nums[r];\n            if (s == 0) {\n                cout << nums[i] << \" \" << nums[l] << \" \" << nums[r] << \"\\n\";\n                found = true; l++; r--;\n                while (l < r && nums[l] == nums[l-1]) l++;\n            } else if (s < 0) l++; else r--;\n        }\n    }\n    if (!found) cout << \"None\";\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<Integer> nums = new ArrayList<>();\n        while (sc.hasNextInt()) nums.add(sc.nextInt());\n        Collections.sort(nums);\n        boolean found = false;\n        for (int i = 0; i < nums.size() - 2; i++) {\n            if (i > 0 && nums.get(i).equals(nums.get(i-1))) continue;\n            int l = i + 1, r = nums.size() - 1;\n            while (l < r) {\n                int s = nums.get(i) + nums.get(l) + nums.get(r);\n                if (s == 0) {\n                    System.out.println(nums.get(i) + \" \" + nums.get(l) + \" \" + nums.get(r));\n                    found = true; l++; r--;\n                    while (l < r && nums.get(l).equals(nums.get(l-1))) l++;\n                } else if (s < 0) l++; else r--;\n            }\n        }\n        if (!found) System.out.println(\"None\");\n    }\n}",
                    c: "#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }\nint main() {\n    int nums[1000], n = 0;\n    while (scanf(\"%d\", &nums[n]) == 1) n++;\n    qsort(nums, n, sizeof(int), cmp);\n    int found = 0;\n    for (int i = 0; i < n - 2; i++) {\n        if (i > 0 && nums[i] == nums[i-1]) continue;\n        int l = i + 1, r = n - 1;\n        while (l < r) {\n            int s = nums[i] + nums[l] + nums[r];\n            if (s == 0) {\n                printf(\"%d %d %d\\n\", nums[i], nums[l], nums[r]);\n                found = 1; l++; r--;\n                while (l < r && nums[l] == nums[l-1]) l++;\n            } else if (s < 0) l++; else r--;\n        }\n    }\n    if (!found) printf(\"None\");\n    return 0;\n}"
                },
                cases: [
                    ["-1 0 1 2 -1 -4", "-1 -1 2\n-1 0 1", false],
                    ["0 1 1", "None", false],
                    ["0 0 0", "0 0 0", true],
                    ["-2 0 0 2 2", "-2 0 2", true],
                    ["-4 -1 -1 0 1 2", "-1 -1 2\n-1 0 1", true]
                ]
            },
            {
                title: "Longest Substring Without Repeating Characters",
                difficulty: "Medium",
                topic: "Strings",
                description: "Given a string `s`, find the length of the longest substring without repeating characters.",
                constraints: "0 <= s.length <= 5 * 10^4",
                editorialDescription: "Maintain a sliding window `[left, right]` and a set/hash table of seen characters. Advance `right` and shrink `left` when a duplicate character occurs.",
                hints: [
                    "⚡ Brute Force: Generate all possible substrings using nested loops i and j. For each substring, verify all characters are unique using a Set. Track max length. Time complexity: O(N³), Space: O(N).",
                    "💡 Better Insight: Use a Sliding Window with two pointers (left, right) and a HashSet. Advance right pointer; if duplicate char is found, advance left pointer and remove chars until window is valid again. Time complexity: O(N), Space: O(N).",
                    "🚀 Optimal Solution: Optimize Sliding Window with a Hash Map storing character last-seen indices. When duplicate is found at right, jump left = max(left, map[char] + 1) directly in O(1). Time complexity: O(N), Space: O(min(N, M))."
                ],
                editorialSolutions: {
                    python: "import sys\ns = sys.stdin.read().strip()\nseen = {}\nl, maxlen = 0, 0\nfor r, c in enumerate(s):\n    if c in seen and seen[c] >= l:\n        l = seen[c] + 1\n    seen[c] = r\n    maxlen = max(maxlen, r - l + 1)\nprint(maxlen)",
                    cpp: "#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; if (!(cin >> s)) { cout << 0; return 0; }\n    unordered_map<char, int> m;\n    int l = 0, maxlen = 0;\n    for (int r = 0; r < s.length(); r++) {\n        if (m.count(s[r]) && m[s[r]] >= l) l = m[s[r]] + 1;\n        m[s[r]] = r;\n        maxlen = max(maxlen, r - l + 1);\n    }\n    cout << maxlen;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) { System.out.println(0); return; }\n        String s = sc.next();\n        Map<Character, Integer> m = new HashMap<>();\n        int l = 0, maxlen = 0;\n        for (int r = 0; r < s.length(); r++) {\n            char c = s.charAt(r);\n            if (m.containsKey(c) && m.get(c) >= l) l = m.get(c) + 1;\n            m.put(c, r);\n            maxlen = Math.max(maxlen, r - l + 1);\n        }\n        System.out.println(maxlen);\n    }\n}",
                    c: "#include <stdio.h>\n#include <string.h>\n#define MAX(a,b) ((a)>(b)?(a):(b))\nint main() {\n    char s[1000]; if (scanf(\"%s\", s) != 1) { printf(\"0\"); return 0; }\n    int last[256]; memset(last, -1, sizeof(last));\n    int l = 0, maxlen = 0;\n    for (int r = 0; s[r]; r++) {\n        unsigned char c = s[r];\n        if (last[c] >= l) l = last[c] + 1;\n        last[c] = r;\n        maxlen = MAX(maxlen, r - l + 1);\n    }\n    printf(\"%d\", maxlen);\n    return 0;\n}"
                },
                cases: [
                    ["abcabcbb", "3", false],
                    ["bbbbb", "1", false],
                    ["pwwkew", "3", true],
                    ["", "0", true],
                    ["au", "2", true]
                ]
            },

            // ── HARD PROBLEMS (6) ───────────────────────────────────────────
            {
                title: "N-Queens",
                difficulty: "Hard",
                topic: "Backtracking",
                description: "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other. Return the number of distinct solutions.",
                constraints: "1 <= n <= 9",
                editorialDescription: "Use recursive backtracking. Track column, main diagonal (`r - c`), and anti-diagonal (`r + c`) conflicts using sets.",
                hints: [
                    "⚡ Brute Force: Generate all N^N queen placements on an N x N board. For each completed placement, check all pairs of queens to see if any share a row, column, or diagonal. Time complexity: O(N! * N), Space: O(N²).",
                    "💡 Better Insight: Place queens row by row sequentially. Before placing a queen in column c of row r, check previous rows to verify no conflicts exist in column c or diagonals.",
                    "🚀 Optimal Solution: Recursive Backtracking with Hash Sets (or boolean arrays) to track occupied columns, main diagonals (r - c), and anti-diagonals (r + c) in O(1) lookup time. Backtrack on invalid paths. Time complexity: O(N!), Space: O(N)."
                ],
                editorialSolutions: {
                    python: "import sys\nn = int(sys.stdin.read().strip())\nans = 0\ndef solve(r, cols, d1, d2):\n    global ans\n    if r == n: ans += 1; return\n    for c in range(n):\n        if c not in cols and (r - c) not in d1 and (r + c) not in d2:\n            solve(r + 1, cols | {c}, d1 | {r - c}, d2 | {r + c})\nsolve(0, set(), set(), set())\nprint(ans)",
                    cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\nint n, ans = 0;\nbool cols[20], d1[40], d2[40];\nvoid solve(int r) {\n    if (r == n) { ans++; return; }\n    for (int c = 0; c < n; c++) {\n        if (!cols[c] && !d1[r - c + n] && !d2[r + c]) {\n            cols[c] = d1[r - c + n] = d2[r + c] = true;\n            solve(r + 1);\n            cols[c] = d1[r - c + n] = d2[r + c] = false;\n        }\n    }\n}\nint main() {\n    if (cin >> n) { solve(0); cout << ans; }\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    static int n, ans = 0;\n    static boolean[] cols = new boolean[20], d1 = new boolean[40], d2 = new boolean[40];\n    static void solve(int r) {\n        if (r == n) { ans++; return; }\n        for (int c = 0; c < n; c++) {\n            if (!cols[c] && !d1[r - c + n] && !d2[r + c]) {\n                cols[c] = d1[r - c + n] = d2[r + c] = true;\n                solve(r + 1);\n                cols[c] = d1[r - c + n] = d2[r + c] = false;\n            }\n        }\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        n = sc.nextInt(); solve(0); System.out.println(ans);\n    }\n}",
                    c: "#include <stdio.h>\n#include <stdbool.h>\nint n, ans = 0;\nbool cols[20], d1[40], d2[40];\nvoid solve(int r) {\n    if (r == n) { ans++; return; }\n    for (int c = 0; c < n; c++) {\n        if (!cols[c] && !d1[r - c + n] && !d2[r + c]) {\n            cols[c] = d1[r - c + n] = d2[r + c] = true;\n            solve(r + 1);\n            cols[c] = d1[r - c + n] = d2[r + c] = false;\n        }\n    }\n}\nint main() {\n    if (scanf(\"%d\", &n) == 1) { solve(0); printf(\"%d\", ans); }\n    return 0;\n}"
                },
                cases: [
                    ["4", "2", false],
                    ["1", "1", false],
                    ["8", "92", true],
                    ["5", "10", true],
                    ["6", "4", true]
                ]
            },
            {
                title: "Trapping Rain Water",
                difficulty: "Hard",
                topic: "Arrays",
                description: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
                constraints: "1 <= n <= 2 * 10^4",
                editorialDescription: "Use Two Pointers (`left = 0`, `right = n-1`). Maintain `leftMax` and `rightMax`. Water trapped at pointer is `max(0, currentMax - height)`.",
                hints: [
                    "⚡ Brute Force: For each bar i, trapped water is min(maxLeft, maxRight) - height[i]. Find maxLeft by scanning index 0 to i, and maxRight by scanning i to N-1 for every bar. Time complexity: O(N²), Space: O(1).",
                    "💡 Better Insight: Precompute leftMax[i] and rightMax[i] arrays using two linear passes. Trapped water at i is min(leftMax[i], rightMax[i]) - height[i]. Time complexity: O(N), Space: O(N).",
                    "🚀 Optimal Solution: Two Pointers (left = 0, right = N - 1) maintaining running maxLeft and maxRight. If height[left] < height[right], water trapped at left is determined by maxLeft (process left++), else by maxRight (process right--). Time complexity: O(N), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nh = list(map(int, sys.stdin.read().split()))\nl, r = 0, len(h) - 1\nlmax = rmax = water = 0\nwhile l < r:\n    if h[l] < h[r]:\n        if h[l] >= lmax: lmax = h[l]\n        else: water += lmax - h[l]\n        l += 1\n    else:\n        if h[r] >= rmax: rmax = h[r]\n        else: water += rmax - h[r]\n        r -= 1\nprint(water)",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<int> h; int val;\n    while (cin >> val) h.push_back(val);\n    int l = 0, r = h.size() - 1, lmax = 0, rmax = 0, water = 0;\n    while (l < r) {\n        if (h[l] < h[r]) {\n            if (h[l] >= lmax) lmax = h[l]; else water += lmax - h[l];\n            l++;\n        } else {\n            if (h[r] >= rmax) rmax = h[r]; else water += rmax - h[r];\n            r--;\n        }\n    }\n    cout << water;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<Integer> h = new ArrayList<>();\n        while (sc.hasNextInt()) h.add(sc.nextInt());\n        int l = 0, r = h.size() - 1, lmax = 0, rmax = 0, water = 0;\n        while (l < r) {\n            if (h.get(l) < h.get(r)) {\n                if (h.get(l) >= lmax) lmax = h.get(l); else water += lmax - h.get(l);\n                l++;\n            } else {\n                if (h.get(r) >= rmax) rmax = h.get(r); else water += rmax - h.get(r);\n                r--;\n            }\n        }\n        System.out.println(water);\n    }\n}",
                    c: "#include <stdio.h>\nint main() {\n    int h[1000], n = 0;\n    while (scanf(\"%d\", &h[n]) == 1) n++;\n    int l = 0, r = n - 1, lmax = 0, rmax = 0, water = 0;\n    while (l < r) {\n        if (h[l] < h[r]) {\n            if (h[l] >= lmax) lmax = h[l]; else water += lmax - h[l];\n            l++;\n        } else {\n            if (h[r] >= rmax) rmax = h[r]; else water += rmax - h[r];\n            r--;\n        }\n    }\n    printf(\"%d\", water);\n    return 0;\n}"
                },
                cases: [
                    ["0 1 0 2 1 0 1 3 2 1 2 1", "6", false],
                    ["4 2 0 3 2 5", "9", false],
                    ["1 1 1", "0", true],
                    ["3 0 2 0 4", "7", true],
                    ["5 4 1 2 3", "2", true]
                ]
            },
            {
                title: "Edit Distance",
                difficulty: "Hard",
                topic: "DP",
                description: "Given two strings `word1` and `word2`, return the minimum number of operations (insert, delete, replace) required to convert `word1` to `word2`.",
                constraints: "0 <= word1.length, word2.length <= 500",
                editorialDescription: "Use 2D Dynamic Programming. `dp[i][j]` represents min edits to turn `w1[0..i]` into `w2[0..j]`. If characters match, `dp[i][j] = dp[i-1][j-1]`, else `1 + min(insert, delete, replace)`.",
                hints: [
                    "⚡ Brute Force: Recursive search trying all 3 operations (insert, delete, replace) at each step when word1[i] != word2[j]. Base cases trigger when an index reaches string end. Time complexity: O(3^max(M,N)), Space: O(max(M,N)).",
                    "💡 Better Insight: Top-Down Dynamic Programming (Memoization). Cache results of recursive subproblems solve(i, j) in a 2D memo table of size (M+1) x (N+1) to prevent duplicate computations. Time complexity: O(M * N), Space: O(M * N).",
                    "🚀 Optimal Solution: 2D Bottom-Up Dynamic Programming. dp[i][j] stores min edits to turn word1[0..i-1] into word2[0..j-1]. If word1[i-1] == word2[j-1], dp[i][j] = dp[i-1][j-1], else 1 + min(insert, delete, replace). Can optimize space to 1D array. Time complexity: O(M * N), Space: O(N)."
                ],
                editorialSolutions: {
                    python: "import sys\nlines = sys.stdin.read().split()\nw1 = lines[0] if len(lines) > 0 else ''\nw2 = lines[1] if len(lines) > 1 else ''\nm, n = len(w1), len(w2)\ndp = [[0]*(n+1) for _ in range(m+1)]\nfor i in range(m+1): dp[i][0] = i\nfor j in range(n+1): dp[0][j] = j\nfor i in range(1, m+1):\n    for j in range(1, n+1):\n        if w1[i-1] == w2[j-1]: dp[i][j] = dp[i-1][j-1]\n        else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\nprint(dp[m][n])",
                    cpp: "#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string w1, w2; cin >> w1 >> w2;\n    int m = w1.length(), n = w2.length();\n    vector<vector<int>> dp(m+1, vector<int>(n+1));\n    for (int i = 0; i <= m; i++) dp[i][0] = i;\n    for (int j = 0; j <= n; j++) dp[0][j] = j;\n    for (int i = 1; i <= m; i++) {\n        for (int j = 1; j <= n; j++) {\n            if (w1[i-1] == w2[j-1]) dp[i][j] = dp[i-1][j-1];\n            else dp[i][j] = 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});\n        }\n    }\n    cout << dp[m][n];\n    return 0;\n}",
                    java: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String w1 = sc.hasNext() ? sc.next() : \"\";\n        String w2 = sc.hasNext() ? sc.next() : \"\";\n        int m = w1.length(), n = w2.length();\n        int[][] dp = new int[m+1][n+1];\n        for (int i = 0; i <= m; i++) dp[i][0] = i;\n        for (int j = 0; j <= n; j++) dp[0][j] = j;\n        for (int i = 1; i <= m; i++) {\n            for (int j = 1; j <= n; j++) {\n                if (w1.charAt(i-1) == w2.charAt(j-1)) dp[i][j] = dp[i-1][j-1];\n                else dp[i][j] = 1 + Math.min(dp[i-1][j], Math.min(dp[i][j-1], dp[i-1][j-1]));\n            }\n        }\n        System.out.println(dp[m][n]);\n    }\n}",
                    c: "#include <stdio.h>\n#include <string.h>\n#define MIN(a,b) ((a)<(b)?(a):(b))\nint main() {\n    char w1[500], w2[500];\n    scanf(\"%s %s\", w1, w2);\n    int m = strlen(w1), n = strlen(w2);\n    int dp[501][501];\n    for (int i = 0; i <= m; i++) dp[i][0] = i;\n    for (int j = 0; j <= n; j++) dp[0][j] = j;\n    for (int i = 1; i <= m; i++) {\n        for (int j = 1; j <= n; j++) {\n            if (w1[i-1] == w2[j-1]) dp[i][j] = dp[i-1][j-1];\n            else dp[i][j] = 1 + MIN(dp[i-1][j], MIN(dp[i][j-1], dp[i-1][j-1]));\n        }\n    }\n    printf(\"%d\", dp[m][n]);\n    return 0;\n}"
                },
                cases: [
                    ["horse ros", "3", false],
                    ["intention execution", "5", false],
                    ["a b", "1", true],
                    ["abc abc", "0", true],
                    ["sea eat", "2", true]
                ]
            },
            {
                title: "Median of Two Sorted Arrays",
                difficulty: "Hard",
                topic: "Binary Search",
                description: "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays in O(log (m+n)) time.",
                constraints: "0 <= m, n <= 1000",
                editorialDescription: "Partition the smaller array using Binary Search such that the left half contains `(m + n + 1) / 2` elements and `maxLeft1 <= minRight2` and `maxLeft2 <= minRight1`.",
                hints: [
                    "⚡ Brute Force: Merge nums1 (size M) and nums2 (size N) into a single sorted array of size M + N, then pick the middle element (or average of two middle elements). Time complexity: O(M + N), Space: O(M + N).",
                    "💡 Better Insight: Use Two Pointers to simulate array merging up to position (M + N) / 2 without allocating extra array memory. Time complexity: O(M + N), Space: O(1).",
                    "🚀 Optimal Solution: Binary Search on the smaller array! Partition nums1 at index i and nums2 at index j such that i + j = (M + N + 1) / 2. Binary search i until maxLeft1 <= minRight2 and maxLeft2 <= minRight1. Time complexity: O(log(min(M, N))), Space: O(1)."
                ],
                editorialSolutions: {
                    python: "import sys\nvals = list(map(int, sys.stdin.read().split()))\nnums = sorted(vals)\nn = len(nums)\nif n % 2 == 1: print(f'{nums[n//2]}.0')\nelse: print(f'{(nums[n//2 - 1] + nums[n//2]) / 2.0}')",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <iomanip>\nusing namespace std;\nint main() {\n    vector<int> v; int x;\n    while (cin >> x) v.push_back(x);\n    sort(v.begin(), v.end());\n    int n = v.size();\n    double ans = (n % 2 == 1) ? v[n/2] : (v[n/2-1] + v[n/2]) / 2.0;\n    cout << fixed << setprecision(1) << ans;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<Integer> list = new ArrayList<>();\n        while (sc.hasNextInt()) list.add(sc.nextInt());\n        Collections.sort(list);\n        int n = list.size();\n        double ans = (n % 2 == 1) ? list.get(n/2) : (list.get(n/2-1) + list.get(n/2)) / 2.0;\n        System.out.printf(\"%.1f\\n\", ans);\n    }\n}",
                    c: "#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }\nint main() {\n    int arr[2000], n = 0;\n    while (scanf(\"%d\", &arr[n]) == 1) n++;\n    qsort(arr, n, sizeof(int), cmp);\n    double ans = (n % 2 == 1) ? arr[n/2] : (arr[n/2-1] + arr[n/2]) / 2.0;\n    printf(\"%.1f\", ans);\n    return 0;\n}"
                },
                cases: [
                    ["1 3 2", "2.0", false],
                    ["1 2 3 4", "2.5", false],
                    ["0 0", "0.0", true],
                    ["10 20 30", "20.0", true],
                    ["1 5 9 10 15 20", "9.5", true]
                ]
            },
            {
                title: "Word Ladder",
                difficulty: "Hard",
                topic: "Graphs",
                description: "Given two words (`beginWord` and `endWord`), and a dictionary's word list, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`.",
                constraints: "1 <= beginWord.length <= 10",
                editorialDescription: "Model word transformations as an unweighted graph and run Breadth-First Search (BFS) to find the shortest path length.",
                hints: [
                    "⚡ Brute Force: Recursive DFS modifying each character of current word to 'a'-'z', checking dictionary validity and recursing to find endWord. Time complexity: O(26^L * N!), Space: O(N).",
                    "💡 Better Insight: Model words as nodes in an unweighted graph, with edges connecting words differing by 1 char. Run Breadth-First Search (BFS) from beginWord to find shortest path length. Time complexity: O(N * L²), Space: O(N * L).",
                    "🚀 Optimal Solution: Bidirectional BFS! Simultaneously expand search frontiers from both beginWord and endWord. Terminate as soon as search frontiers intersect, dramatically reducing search tree depth. Time complexity: O(N * L²), Space: O(N * L)."
                ],
                editorialSolutions: {
                    python: "import sys\nlines = sys.stdin.read().split()\nif len(lines) < 2: print(0); sys.exit(0)\nbeg, end = lines[0], lines[1]\nwords = set(lines[2:])\nif end not in words: print(0); sys.exit(0)\nq = [(beg, 1)]\nvisited = {beg}\nfound = 0\nwhile q:\n    curr, steps = q.pop(0)\n    if curr == end: found = steps; break\n    for i in range(len(curr)):\n        for c in 'abcdefghijklmnopqrstuvwxyz':\n            nxt = curr[:i] + c + curr[i+1:]\n            if nxt in words and nxt not in visited:\n                visited.add(nxt)\n                q.append((nxt, steps + 1))\nprint(found)",
                    cpp: "#include <iostream>\n#include <string>\n#include <vector>\n#include <unordered_set>\n#include <queue>\nusing namespace std;\nint main() {\n    string beg, end, w;\n    if (!(cin >> beg >> end)) { cout << 0; return 0; }\n    unordered_set<string> words;\n    while (cin >> w) words.insert(w);\n    if (!words.count(end)) { cout << 0; return 0; }\n    queue<pair<string, int>> q; q.push({beg, 1});\n    unordered_set<string> vis; vis.insert(beg);\n    int ans = 0;\n    while (!q.empty()) {\n        auto [curr, steps] = q.front(); q.pop();\n        if (curr == end) { ans = steps; break; }\n        for (int i = 0; i < curr.length(); i++) {\n            char orig = curr[i];\n            for (char c = 'a'; c <= 'z'; c++) {\n                curr[i] = c;\n                if (words.count(curr) && !vis.count(curr)) {\n                    vis.insert(curr);\n                    q.push({curr, steps + 1});\n                }\n            }\n            curr[i] = orig;\n        }\n    }\n    cout << ans;\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) { System.out.println(0); return; }\n        String beg = sc.next(), end = sc.next();\n        Set<String> words = new HashSet<>();\n        while (sc.hasNext()) words.add(sc.next());\n        if (!words.contains(end)) { System.out.println(0); return; }\n        Queue<String> q = new LinkedList<>(); q.add(beg);\n        Map<String, Integer> vis = new HashMap<>(); vis.put(beg, 1);\n        int ans = 0;\n        while (!q.isEmpty()) {\n            String curr = q.poll(); int steps = vis.get(curr);\n            if (curr.equals(end)) { ans = steps; break; }\n            char[] chs = curr.toCharArray();\n            for (int i = 0; i < chs.length; i++) {\n                char orig = chs[i];\n                for (char c = 'a'; c <= 'z'; c++) {\n                    chs[i] = c; String nxt = new String(chs);\n                    if (words.contains(nxt) && !vis.containsKey(nxt)) {\n                        vis.put(nxt, steps + 1); q.add(nxt);\n                    }\n                }\n                chs[i] = orig;\n            }\n        }\n        System.out.println(ans);\n    }\n}",
                    c: "#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n#define MAXW 1000\n#define MAXL 20\nchar words[MAXW][MAXL];\nint visited[MAXW], qIdx[MAXW], qSteps[MAXW];\nint n = 0;\nint diffOne(const char* a, const char* b) {\n    int d = 0; for (int i = 0; a[i] || b[i]; i++) { if (a[i] != b[i]) d++; if (d > 1) return 0; } return d == 1;\n}\nint main() {\n    char beg[MAXL], end[MAXL];\n    if (scanf(\"%s %s\", beg, end) != 2) { printf(\"0\"); return 0; }\n    if (strcmp(beg, end) == 0) { printf(\"1\"); return 0; }\n    while (scanf(\"%s\", words[n]) == 1) n++;\n    int endIdx = -1;\n    for (int i = 0; i < n; i++) if (strcmp(words[i], end) == 0) { endIdx = i; break; }\n    if (endIdx == -1) { printf(\"0\"); return 0; }\n    memset(visited, 0, sizeof(visited));\n    int front = 0, back = 0;\n    for (int i = 0; i < n; i++) {\n        if (diffOne(beg, words[i])) { visited[i] = 1; qIdx[back] = i; qSteps[back] = 2; back++; }\n    }\n    while (front < back) {\n        int ci = qIdx[front]; int cs = qSteps[front]; front++;\n        if (ci == endIdx) { printf(\"%d\", cs); return 0; }\n        for (int i = 0; i < n; i++) {\n            if (!visited[i] && diffOne(words[ci], words[i])) { visited[i] = 1; qIdx[back] = i; qSteps[back] = cs + 1; back++; }\n        }\n    }\n    printf(\"0\");\n    return 0;\n}"
                },
                cases: [
                    ["hit cog hot dot dog lot log cog", "5", false],
                    ["hit cog hot dot dog lot log", "0", false],
                    ["a c a b c", "2", true],
                    ["same same same", "1", true],
                    ["hot dog hot dog", "2", true]
                ]
            },
            {
                title: "Merge k Sorted Lists",
                difficulty: "Hard",
                topic: "Graphs",
                description: "You are given an array of `k` linked-lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list.",
                constraints: "0 <= k <= 10^4",
                editorialDescription: "Use a Min-Heap / Priority Queue or Divide and Conquer to merge lists in O(N log k) time.",
                hints: [
                    "⚡ Brute Force: Traverse all k linked lists, collect all node values into an array, sort the array, and build a new linked list from sorted values. Time complexity: O(N log N), Space: O(N).",
                    "💡 Better Insight: Compare the current head nodes of all k lists in each iteration to pick the smallest element, and advance that list's pointer. Time complexity: O(k * N), Space: O(1).",
                    "🚀 Optimal Solution: Use a Min-Heap / Priority Queue of size k to store current head nodes of all lists, extracting minimum in O(log k). Alternatively, use Divide and Conquer to merge lists in pairs recursively. Time complexity: O(N log k), Space: O(k)."
                ],
                editorialSolutions: {
                    python: "import sys\nvals = sorted(list(map(int, sys.stdin.read().split())))\nprint(' '.join(map(str, vals)) if vals else 'Empty')",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<int> v; int x;\n    while (cin >> x) v.push_back(x);\n    if (v.empty()) { cout << \"Empty\"; return 0; }\n    sort(v.begin(), v.end());\n    for (int i = 0; i < v.size(); i++) cout << v[i] << (i == v.size()-1 ? \"\" : \" \");\n    return 0;\n}",
                    java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<Integer> list = new ArrayList<>();\n        while (sc.hasNextInt()) list.add(sc.nextInt());\n        if (list.isEmpty()) { System.out.println(\"Empty\"); return; }\n        Collections.sort(list);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < list.size(); i++) { if (i > 0) sb.append(\" \"); sb.append(list.get(i)); }\n        System.out.print(sb.toString());\n    }\n}",
                    c: "#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }\nint main() {\n    int arr[1000], n = 0;\n    while (scanf(\"%d\", &arr[n]) == 1) n++;\n    if (n == 0) { printf(\"Empty\"); return 0; }\n    qsort(arr, n, sizeof(int), cmp);\n    for (int i = 0; i < n; i++) printf(\"%d%s\", arr[i], (i == n-1 ? \"\" : \" \"));\n    return 0;\n}"
                },
                cases: [
                    ["1 4 5 1 3 4 2 6", "1 1 2 3 4 4 5 6", false],
                    ["", "Empty", false],
                    ["1", "1", true],
                    ["10 2 5", "2 5 10", true],
                    ["-1 0 3", "-1 0 3", true]
                ]
            }
        ];

        for (const p of problems) {
            const problem = await Problem.create({
                title: p.title,
                description: p.description,
                constraints: p.constraints,
                difficulty: p.difficulty,
                editorialDescription: p.editorialDescription,
                editorialSolutions: p.editorialSolutions,
                hints: p.hints || []
            });
            if (topics[p.topic]) await problem.addTopic(topics[p.topic]);
            for (const c of p.cases) {
                await TestCase.create({ problemId: problem.id, input: c[0], expectedOutput: c[1], isHidden: c[2] });
            }
        }

        console.log("FULL SEEDING COMPLETE! 8 Easy, 6 Medium, 6 Hard problems created with 3 genuine hints, 5 test cases, and 4-language editorials.");
        process.exit(0);
    } catch (e) {
        console.error("Seeding Error:", e);
        process.exit(1);
    }
}

seed();
