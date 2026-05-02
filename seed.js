const { sequelize, Problem, TestCase, Topic } = require('./db');

async function seed() {
    try {
        console.log("Seeding ALL 20 Problems with full details...");
        await sequelize.sync();
        await TestCase.destroy({ where: {}, truncate: { cascade: true } });
        await Problem.destroy({ where: {}, truncate: { cascade: true } });
        await Topic.destroy({ where: {}, truncate: { cascade: true } });

        const topicsData = ["Arrays", "Strings", "Math", "Recursion", "DP", "Binary Search", "Bit Manipulation"];
        const topics = {};
        for (const name of topicsData) {
            const [topic] = await Topic.findOrCreate({ where: { name } });
            topics[name] = topic;
        }

        const problems = [
            {
                title: "Two Sum", topic: "Arrays", difficulty: "Easy",
                description: "Find two numbers in an array that add up to a target value.",
                constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
                editorialDescription: "Use a Hash Map to store indices of visited numbers. O(n) time.",
                editorialSolutions: {
                    python: "def twoSum(nums, target):\n    m = {}\n    for i, n in enumerate(nums):\n        if target-n in m: return [m[target-n], i]\n        m[n] = i",
                    cpp: "vector<int> twoSum(vector<int>& n, int t) { unordered_map<int, int> m; for(int i=0; i<n.size(); i++) { if(m.count(t-n[i])) return {m[t-n[i]], i}; m[n[i]]=i; } return {}; }",
                    java: "public int[] twoSum(int[] n, int t) { HashMap<Integer, Integer> m = new HashMap<>(); for(int i=0; i<n.length; i++) { if(m.containsKey(t-n[i])) return new int[]{m.get(t-n[i]), i}; m.put(n[i], i); } return new int[0]; }",
                    c: "int* twoSum(int* n, int s, int t, int* r) { for(int i=0; i<s; i++) for(int j=i+1; j<s; j++) if(n[i]+n[j]==t) { int* a=malloc(8); a[0]=i; a[1]=j; *r=2; return a; } *r=0; return NULL; }"
                },
                cases: [["9\n2 7", "2 7", false], ["6\n3 2 4", "2 4", false], ["6\n3 3", "3 3", true], ["10\n1 9", "1 9", true]]
            },
            {
                title: "Palindrome Number", topic: "Math", difficulty: "Easy",
                description: "Determine whether an integer is a palindrome.",
                constraints: "-2^31 <= x <= 2^31 - 1",
                editorialDescription: "Reverse the number string and compare. O(log n) time.",
                editorialSolutions: {
                    python: "def isPalindrome(x): return str(x) == str(x)[::-1] if x >= 0 else False",
                    cpp: "bool isPalindrome(int x) { if(x<0) return false; string s=to_string(x), r=s; reverse(r.begin(), r.end()); return s==r; }",
                    java: "public boolean isPalindrome(int x) { if(x<0) return false; String s=String.valueOf(x); return s.equals(new StringBuilder(s).reverse().toString()); }",
                    c: "bool isPalindrome(int x) { if(x<0) return false; char s[20]; sprintf(s, \"%d\", x); int n=strlen(s); for(int i=0; i<n/2; i++) if(s[i]!=s[n-1-i]) return false; return true; }"
                },
                cases: [["121", "true", false], ["-121", "false", false], ["10", "false", true], ["0", "true", true]]
            },
            {
                title: "Reverse String", topic: "Strings", difficulty: "Medium",
                description: "Reverse a string given as an array of characters.",
                constraints: "1 <= s.length <= 10^5",
                editorialDescription: "Use two pointers and swap in-place. O(n) time.",
                editorialSolutions: {
                    python: "print(input()[::-1])",
                    cpp: "int main() { string s; cin >> s; reverse(s.begin(), s.end()); cout << s; }",
                    java: "public static void main(String[] args) { System.out.println(new StringBuilder(new Scanner(System.in).next()).reverse()); }",
                    c: "int main() { char s[100]; scanf(\"%s\", s); int n=strlen(s); for(int i=n-1; i>=0; i--) printf(\"%c\", s[i]); }"
                },
                cases: [["hi", "ih", false], ["abc", "cba", false], ["hello", "olleh", true], ["Spectral", "lartcepS", true]]
            },
            {
                title: "Fibonacci Number", topic: "Recursion", difficulty: "Easy",
                description: "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is, F(0) = 0, F(1) = 1 F(n) = F(n - 1) + F(n - 2), for n > 1. Given n, calculate F(n).",
                constraints: "0 <= n <= 30",
                editorialDescription: "Use an iterative approach to save memory. O(n) time.",
                editorialSolutions: {
                    python: "n=int(input()); a,b=0,1\nfor _ in range(n): a,b=b,a+b\nprint(a)",
                    cpp: "int main() { int n; cin >> n; int a=0,b=1,c; if(n<1) { cout << 0; return 0; } for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } cout << b; }",
                    java: "public static void main(String[] args) { int n=new Scanner(System.in).nextInt(); if(n<2) { System.out.println(n); return; } int a=0,b=1,c; for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } System.out.println(b); }",
                    c: "int main() { int n; scanf(\"%d\", &n); if(n<2) { printf(\"%d\", n); return 0; } int a=0,b=1,c; for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } printf(\"%d\", b); }"
                },
                cases: [["2", "1", false], ["3", "2", false], ["10", "55", true], ["1", "1", true]]
            },
            {
                title: "Binary Search", topic: "Binary Search", difficulty: "Medium",
                description: "Find a target value in a sorted array.",
                constraints: "1 <= nums.length <= 10^4",
                editorialDescription: "Maintain left and right boundaries and narrow them down. O(log n) time.",
                editorialSolutions: {
                    python: "t,n=int(input()),list(map(int, input().split()))\nl,r=0,len(n)-1\nwhile l<=r: m=(l+r)//2\n if n[m]==t: print(m); exit()\n if n[m]<t: l=m+1\n else: r=m-1\nprint(-1)",
                    cpp: "int main() { int t; cin >> t; vector<int> n; int x; while(cin>>x) n.push_back(x); int l=0, r=n.size()-1, m; while(l<=r) { m=(l+r)/2; if(n[m]==t) { cout << m; return 0; } if(n[m]<t) l=m+1; else r=m-1; } cout << -1; }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); int t=sc.nextInt(); List<Integer> n=new ArrayList<>(); while(sc.hasNextInt()) n.add(sc.nextInt()); int l=0, r=n.size()-1; while(l<=r) { int m=(l+r)/2; if(n.get(m)==t) { System.out.println(m); return; } if(n.get(m)<t) l=m+1; else r=m-1; } System.out.println(-1); }",
                    c: "int main() { int t; scanf(\"%d\", &t); int n[100], s=0; while(scanf(\"%d\", &n[s])!=EOF) s++; int l=0, r=s-1; while(l<=r) { int m=(l+r)/2; if(n[m]==t) { printf(\"%d\", m); return 0; } if(n[m]<t) l=m+1; else r=m-1; } printf(\"-1\"); }"
                },
                cases: [["9\n1 2 3 5 9 12", "4", false], ["2\n1 3 5 6", "-1", false], ["5\n5", "0", true], ["1\n1 2", "0", true]]
            },
            {
                title: "FizzBuzz", topic: "Math", difficulty: "Medium",
                description: "Print numbers 1 to n with Fizz, Buzz replacements.",
                constraints: "1 <= n <= 10^4",
                editorialDescription: "Iterate and check divisibility by 3, 5, and 15. O(n) time.",
                editorialSolutions: {
                    python: "n=int(input())\nfor i in range(1,n+1):\n if i%15==0: print('FizzBuzz')\n elif i%3==0: print('Fizz')\n elif i%5==0: print('Buzz')\n else: print(i)",
                    cpp: "int main() { int n; cin >> n; for(int i=1; i<=n; i++) { if(i%15==0) cout << \"FizzBuzz\\n\"; else if(i%3==0) cout << \"Fizz\\n\"; else if(i%5==0) cout << \"Buzz\\n\"; else cout << i << \"\\n\"; } }",
                    java: "public static void main(String[] args) { int n=new Scanner(System.in).nextInt(); for(int i=1; i<=n; i++) { if(i%15==0) System.out.println(\"FizzBuzz\"); else if(i%3==0) System.out.println(\"Fizz\"); else if(i%5==0) System.out.println(\"Buzz\"); else System.out.println(i); } }",
                    c: "int main() { int n; scanf(\"%d\", &n); for(int i=1; i<=n; i++) { if(i%15==0) printf(\"FizzBuzz\\n\"); else if(i%3==0) printf(\"Fizz\\n\"); else if(i%5==0) printf(\"Buzz\\n\"); else printf(\"%d\\n\", i); } }"
                },
                cases: [["3", "1\n2\nFizz", false], ["5", "1\n2\nFizz\n4\nBuzz", false], ["15", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", true], ["1", "1", true]]
            },
            {
                title: "Valid Parentheses", topic: "Strings", difficulty: "Medium",
                description: "Check if brackets are balanced in a string.",
                constraints: "1 <= s.length <= 10^4",
                editorialDescription: "Use a stack to match brackets. O(n) time.",
                editorialSolutions: {
                    python: "s=input(); st=[]; m={')':'(', '}':'{', ']':'['}\nfor c in s:\n if c in m: (st.pop() if st and st[-1]==m[c] else (print('false') or exit()))\n else: st.append(c)\nprint('true' if not st else 'false')",
                    cpp: "int main() { string s; cin >> s; stack<char> st; for(char c : s) { if(c=='('||c=='{'||c=='[') st.push(c); else { if(st.empty()) { cout << \"false\"; return 0; } char t=st.top(); if((c==')'&&t=='(')||(c=='}'&&t=='{')||(c==']'&&t=='[')) st.pop(); else { cout << \"false\"; return 0; } } } cout << (st.empty()?\"true\":\"false\"); }",
                    java: "public static void main(String[] args) { String s=new Scanner(System.in).next(); Stack<Character> st=new Stack<>(); for(char c : s.toCharArray()) { if(c=='('||c=='{'||c=='[') st.push(c); else { if(st.isEmpty()) { System.out.println(\"false\"); return; } char t=st.pop(); if(!((c==')'&&t=='(')||(c=='}'&&t=='{')||(c==']'&&t=='['))) { System.out.println(\"false\"); return; } } } System.out.println(st.isEmpty()?\"true\":\"false\"); }",
                    c: "int main() { char s[1000]; scanf(\"%s\", s); char st[1000]; int t=-1; for(int i=0; s[i]; i++) { if(s[i]=='('||s[i]=='{'||s[i]=='[') st[++t]=s[i]; else { if(t==-1) { printf(\"false\"); return 0; } char o=st[t--]; if(!((s[i]==')'&&o=='(')||(s[i]=='}'&&o=='{')||(s[i]==']'&&o=='['))) { printf(\"false\"); return 0; } } } printf(t==-1?\"true\":\"false\"); }"
                },
                cases: [["()", "true", false], ["(]", "false", false], ["()[]{}", "true", true], ["([)]", "false", true]]
            },
            {
                title: "Single Number", topic: "Bit Manipulation", difficulty: "Easy",
                description: "Find the single element in an array of duplicates.",
                constraints: "1 <= nums.length <= 3 * 10^4",
                editorialDescription: "XOR all elements together; duplicates cancel out. O(n) time.",
                editorialSolutions: {
                    python: "nums=list(map(int, input().split())); a=0\nfor n in nums: a ^= n\nprint(a)",
                    cpp: "int main() { int x, a=0; while(cin>>x) a^=x; cout << a; }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); int a=0; while(sc.hasNextInt()) a^=sc.nextInt(); System.out.println(a); }",
                    c: "int main() { int x, a=0; while(scanf(\"%d\", &x)!=EOF) a^=x; printf(\"%d\", a); }"
                },
                cases: [["2 2 1", "1", false], ["4 1 2 1 2", "4", false], ["1", "1", true], ["7 3 3", "7", true]]
            },
            {
                title: "Move Zeroes", topic: "Arrays", difficulty: "Medium",
                description: "Given an integer array, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
                constraints: "1 <= nums.length <= 10^4",
                editorialDescription: "Maintain a non-zero pointer and overwrite. O(n) time.",
                editorialSolutions: {
                    python: "n=list(map(int, input().split())); nz=[x for x in n if x!=0]\nprint(*(nz + [0]*(len(n)-len(nz))))",
                    cpp: "int main() { int x; vector<int> n; while(cin>>x) n.push_back(x); int p=0; for(int i=0; i<n.size(); i++) if(n[i]!=0) n[p++]=n[i]; while(p<n.size()) n[p++]=0; for(int i=0; i<n.size(); i++) cout << n[i] << (i==n.size()-1?\"\":\" \"); }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); List<Integer> n=new ArrayList<>(); while(sc.hasNextInt()) n.add(sc.nextInt()); int p=0; for(int i=0; i<n.size(); i++) if(n.get(i)!=0) Collections.swap(n, p++, i); for(int i=0; i<n.size(); i++) System.out.print(n.get(i) + (i==n.size()-1?\"\":\" \")); }",
                    c: "int main() { int n[100], s=0, x; while(scanf(\"%d\", &x)!=EOF) n[s++]=x; int p=0; for(int i=0; i<s; i++) if(n[i]!=0) n[p++]=n[i]; while(p<s) n[p++]=0; for(int i=0; i<s; i++) printf(\"%d%s\", n[i], i==s-1?\"\":\" \"); }"
                },
                cases: [["0 1 0 3 12", "1 3 12 0 0", false], ["0", "0", false], ["1 0", "1 0", true], ["1 2 3", "1 2 3", true]]
            },
            {
                title: "Climbing Stairs", topic: "DP", difficulty: "Hard",
                description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                constraints: "1 <= n <= 45",
                editorialDescription: "This is a Fibonacci sequence problem. O(n) time.",
                editorialSolutions: {
                    python: "n=int(input()); a,b=1,1\nfor _ in range(n): a,b=b,a+b\nprint(a)",
                    cpp: "int main() { int n; cin >> n; int a=1,b=1,c; for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } cout << (n<1?0: (n==1?1:b)); }",
                    java: "public static void main(String[] args) { int n=new Scanner(System.in).nextInt(); int a=1,b=1,c; for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } System.out.println(n<1?0:(n==1?1:b)); }",
                    c: "int main() { int n; scanf(\"%d\", &n); int a=1,b=1,c; for(int i=2; i<=n; i++) { c=a+b; a=b; b=c; } printf(\"%d\", n<1?0:(n==1?1:b)); }"
                },
                cases: [["2", "2", false], ["3", "3", false], ["5", "8", true], ["1", "1", true]]
            },
            {
                title: "Max Subarray", topic: "DP", difficulty: "Hard",
                description: "Given an integer array, find the subarray with the largest sum, and return its sum.",
                constraints: "1 <= nums.length <= 10^5",
                editorialDescription: "Use Kadane's Algorithm. O(n) time.",
                editorialSolutions: {
                    python: "n=list(map(int, input().split())); c=m=n[0]\nfor x in n[1:]: c=max(x, c+x); m=max(m, c)\nprint(m)",
                    cpp: "int main() { int x; vector<int> n; while(cin>>x) n.push_back(x); int c=n[0], m=n[0]; for(int i=1; i<n.size(); i++) { c=max(n[i], c+n[i]); m=max(m, c); } cout << m; }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); List<Integer> n=new ArrayList<>(); while(sc.hasNextInt()) n.add(sc.nextInt()); int c=n.get(0), m=n.get(0); for(int i=1; i<n.size(); i++) { c=Math.max(n.get(i), c+n.get(i)); m=Math.max(m, c); } System.out.println(m); }",
                    c: "int main() { int n[100], s=0, x; while(scanf(\"%d\", &x)!=EOF) n[s++]=x; int c=n[0], m=n[0]; for(int i=1; i<s; i++) { if(n[i]>c+n[i]) c=n[i]; else c+=n[i]; if(c>m) m=c; } printf(\"%d\", m); }"
                },
                cases: [["-2 1 -3 4 -1 2 1 -5 4", "6", false], ["1", "1", false], ["5 4 -1 7 8", "23", true], ["-1", "-1", true]]
            },
            {
                title: "Valid Anagram", topic: "Strings", difficulty: "Hard",
                description: "Given two strings, return true if one string is an anagram of other, and false otherwise.",
                constraints: "1 <= s.length, t.length <= 5 * 10^4",
                editorialDescription: "Sort and compare both strings. O(n log n) time.",
                editorialSolutions: {
                    python: "s,t=input(),input(); print('true' if sorted(s)==sorted(t) else 'false')",
                    cpp: "int main() { string s, t; cin >> s >> t; sort(s.begin(), s.end()); sort(t.begin(), t.end()); cout << (s==t?\"true\":\"false\"); }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); String s=sc.next(), t=sc.next(); char[] a=s.toCharArray(), b=t.toCharArray(); Arrays.sort(a); Arrays.sort(b); System.out.println(Arrays.equals(a,b)?\"true\":\"false\"); }",
                    c: "int main() { char s[100], t[100]; scanf(\"%s %s\", s, t); int c[26]={0}; for(int i=0; s[i]; i++) c[s[i]-'a']++; for(int i=0; t[i]; i++) c[t[i]-'a']--; for(int i=0; i<26; i++) if(c[i]!=0) { printf(\"false\"); return 0; } printf(\"true\"); }"
                },
                cases: [["anagram\nnagaram", "true", false], ["rat\ncar", "false", false], ["ab\nba", "true", true], ["a\na", "true", true]]
            },
            {
                title: "Plus One", topic: "Arrays", difficulty: "Easy",
                description: "You are given a large integer represented as an integer array, where each array[i] is the ith digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. The large integer does not contain any leading 0's.Increment the large integer by one and return the resulting array of digits.Increment a large integer (as an array) by one.",
                constraints: "1 <= digits.length <= 100",
                editorialDescription: "Start from the end and handle carry-over. O(n) time.",
                editorialSolutions: {
                    python: "d=list(map(int, input().split())); n=len(d)\nfor i in range(n-1, -1, -1):\n if d[i]<9: d[i]+=1; print(*d); exit()\n d[i]=0\nprint(*( [1]+d ))",
                    cpp: "int main() { vector<int> d; int x; while(cin>>x) d.push_back(x); for(int i=d.size()-1; i>=0; i--) { if(d[i]<9) { d[i]++; for(int v:d) cout << v << \" \"; return 0; } d[i]=0; } cout << 1 << \" \"; for(int v:d) cout << v << \" \"; }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); List<Integer> d=new ArrayList<>(); while(sc.hasNextInt()) d.add(sc.nextInt()); for(int i=d.size()-1; i>=0; i--) { if(d.get(i)<9) { d.set(i, d.get(i)+1); for(int v:d) System.out.print(v+\" \"); return; } d.set(i, 0); } System.out.print(\"1 \"); for(int v:d) System.out.print(v+\" \"); }",
                    c: "int main() { int d[100], s=0, x; while(scanf(\"%d\", &x)!=EOF) d[s++]=x; for(int i=s-1; i>=0; i--) { if(d[i]<9) { d[i]++; for(int j=0; j<s; j++) printf(\"%d \", d[j]); return 0; } d[i]=0; } printf(\"1 \"); for(int j=0; j<s; j++) printf(\"%d \", d[j]); }"
                },
                cases: [["1 2 3", "1 2 4", false], ["9 9", "1 0 0", false], ["4 3 2 1", "4 3 2 2", true], ["0", "1", true]]
            },
            {
                title: "Search Insert Position", topic: "Binary Search", difficulty: "Hard",
                description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
                constraints: "1 <= nums.length <= 10^4",
                editorialDescription: "Use Binary Search to find the position. O(log n) time.",
                editorialSolutions: {
                    python: "t,n=int(input()),list(map(int, input().split())); l,r=0,len(n)-1\nwhile l<=r: m=(l+r)//2\n if n[m]==t: print(m); exit()\n if n[m]<t: l=m+1\n else: r=m-1\nprint(l)",
                    cpp: "int main() { int t; cin >> t; vector<int> n; int x; while(cin>>x) n.push_back(x); int l=0, r=n.size()-1, m; while(l<=r) { m=(l+r)/2; if(n[m]==t) { cout << m; return 0; } if(n[m]<t) l=m+1; else r=m-1; } cout << l; }",
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); int t=sc.nextInt(); List<Integer> n=new ArrayList<>(); while(sc.hasNextInt()) n.add(sc.nextInt()); int l=0, r=n.size()-1; while(l<=r) { int m=(l+r)/2; if(n.get(m)==t) { System.out.println(m); return; } if(n.get(m)<t) l=m+1; else r=m-1; } System.out.println(l); }",
                    c: "int main() { int t; scanf(\"%d\", &t); int n[100], s=0; while(scanf(\"%d\", &n[s])!=EOF) s++; int l=0, r=s-1; while(l<=r) { int m=(l+r)/2; if(n[m]==t) { printf(\"%d\", m); return 0; } if(n[m]<t) l=m+1; else r=m-1; } printf(\"%d\", l); }"
                },
                cases: [["5\n1 3 5 6", "2", false], ["2\n1 3 5 6", "1", false], ["7\n1 3 5 6", "4", true], ["0\n1 3 5 6", "0", true]]
            },
            {
                title: "Power of Two", topic: "Math", difficulty: "Medium",
                description: "Given an integer n, return true if it is a power of two. Otherwise, return false. An integer n is a power of two, if there exists an integer x such that n == 2x.",
                constraints: "-2^31 <= n <= 2^31 - 1",
                editorialDescription: "Check if (n & (n-1)) is zero for n > 0. O(1) time.",
                editorialSolutions: {
                    python: "n=int(input()); print('true' if n>0 and (n & (n-1))==0 else 'false')",
                    cpp: "int main() { long n; cin >> n; cout << (n>0 && (n & (n-1))==0 ? \"true\":\"false\"); }",
                    java: "public static void main(String[] args) { long n=new Scanner(System.in).nextLong(); System.out.println(n>0 && (n & (n-1))==0 ? \"true\":\"false\"); }",
                    c: "int main() { long n; scanf(\"%ld\", &n); printf(n>0 && (n & (n-1))==0 ? \"true\":\"false\"); }"
                },
                cases: [["1", "true", false], ["16", "true", false], ["3", "false", true], ["0", "false", true]]
            },
            {
                title: "Square Root", topic: "Math", difficulty: "Medium",
                description: "Truncated integer square root.",
                constraints: "0 <= x <= 2^31 - 1",
                editorialDescription: "Binary search between 0 and x. O(log x) time.",
                editorialSolutions: {
                    python: "x=int(input()); l,r,a=0,x,0\nwhile l<=r: m=(l+r)//2\n if m*m<=x: a=m; l=m+1\n else: r=m-1\nprint(a)",
                    cpp: "int main() { long x; cin >> x; long l=0, r=x, a=0, m; while(l<=r) { m=(l+r)/2; if(m*m<=x) { a=m; l=m+1; } else r=m-1; } cout << a; }",
                    java: "public static void main(String[] args) { long x=new Scanner(System.in).nextLong(); long l=0, r=x, a=0; while(l<=r) { long m=(l+r)/2; if(m*m<=x) { a=m; l=m+1; } else r=m-1; } System.out.println(a); }",
                    c: "int main() { long x; scanf(\"%ld\", &x); long l=0, r=x, a=0; while(l<=r) { long m=(l+r)/2; if(m*m<=x) { a=m; l=m+1; } else r=m-1; } printf(\"%ld\", a); }"
                },
                cases: [["4", "2", false], ["8", "2", false], ["16", "4", true], ["0", "0", true]]
            },
            {
                title: "Length of Last Word", topic: "Strings", difficulty: "Easy",
                description: "Given a string s consisting of words and spaces, return the length of the last word in the string. A word is a maximal substring consisting of non-space characters only.",
                constraints: "1 <= s.length <= 10^4",
                editorialDescription: "Trim and count from the end. O(n) time.",
                editorialSolutions: {
                    python: "print(len(input().strip().split()[-1]))",
                    cpp: "int main() { string s; getline(cin, s); int i=s.length()-1, l=0; while(i>=0 && s[i]==' ') i--; while(i>=0 && s[i]!=' ') { l++; i--; } cout << l; }",
                    java: "public static void main(String[] args) { String s=new Scanner(System.in).nextLine().trim(); System.out.println(s.length() - s.lastIndexOf(' ') - 1); }",
                    c: "int main() { char s[100]; fgets(s, 100, stdin); int n=strlen(s); if(s[n-1]=='\\n') s[--n]=0; int i=n-1, l=0; while(i>=0 && s[i]==' ') i--; while(i>=0 && s[i]!=' ') { l++; i--; } printf(\"%d\", l); }"
                },
                cases: [["Hello World", "5", false], ["   fly me   to   the moon  ", "4", false], ["a", "1", true], ["hello", "5", true]]
            },
            {
                title: "Sum of Two Integers", topic: "Bit Manipulation", difficulty: "Medium",
                description: "Given two integers a and b, return the sum of the two integers without using the operators + and -.",
                constraints: "-1000 <= a, b <= 1000",
                editorialDescription: "Use XOR for sum and AND with shift for carry. O(1) time.",
                editorialSolutions: {
                    python: "a,b=map(int, input().split())\nwhile b: a,b = (a^b) & 0xFFFFFFFF, ((a&b)<<1) & 0xFFFFFFFF\nprint(a if a <= 0x7FFFFFFF else ~(a ^ 0xFFFFFFFF))",
                    cpp: `int main() {
                     int a, b;
                     cin >> a >> b;
                     while(b) {
                      unsigned c=(a&b);
                      a^=b; b=c<<1;
                     }
                     cout << a;
                    }`,
                    java: "public static void main(String[] args) { Scanner sc=new Scanner(System.in); int a=sc.nextInt(), b=sc.nextInt(); while(b!=0) { int c=(a&b); a^=b; b=c<<1; } System.out.println(a); }",
                    c: "int main() { int a, b; scanf(\"%d %d\", &a, &b); while(b) { int c=(a&b); a^=b; b=c<<1; } printf(\"%d\", a); }"
                },
                cases: [["1 2", "3", false], ["2 3", "5", false], ["-1 1", "0", true], ["10 20", "30", true]]
            },
            {
                title: "Factorial", topic: "Recursion", difficulty: "Easy",
                description: "The factorial of a positive integer n is the product of all positive integers less than or equal to n. For example, factorial(10) = 10 * 9 * 8 * 7 * 6 * 5 * 4 * 3 * 2 * 1.",
                constraints: "0 <= n <= 12",
                editorialDescription: "Recursive or iterative multiplication. O(n) time.",
                editorialSolutions: {
                    python: "def f(n): return 1 if n==0 else n*f(n-1)\nprint(f(int(input())))",
                    cpp: "int f(int n) { return n==0?1:n*f(n-1); } int main() { int n; cin >> n; cout << f(n); }",
                    java: "static int f(int n) { return n==0?1:n*f(n-1); } public static void main(String[] args) { System.out.println(f(new Scanner(System.in).nextInt())); }",
                    c: "int f(int n) { return n==0?1:n*f(n-1); } int main() { int n; scanf(\"%d\", &n); printf(\"%d\", f(n)); }"
                },
                cases: [["3", "6", false], ["5", "120", false], ["0", "1", true], ["1", "1", true]]
            },
            {
                title: "Power of Three", topic: "Math", difficulty: "Hard",
                description: "Given an integer n, return true if it is a power of three. Otherwise, return false. An integer n is a power of three, if there exists an integer x such that n == 3x.",
                constraints: "-2^31 <= n <= 2^31 - 1",
                editorialDescription: "Check if 3^19 is divisible by n. O(1) time.",
                editorialSolutions: {
                    python: "n=int(input()); print('true' if n>0 and 1162261467 % n == 0 else 'false')",
                    cpp: "int main() { int n; cin >> n; cout << (n>0 && 1162261467 % n == 0 ? \"true\":\"false\"); }",
                    java: "public static void main(String[] args) { int n=new Scanner(System.in).nextInt(); System.out.println(n>0 && 1162261467 % n == 0 ? \"true\":\"false\"); }",
                    c: "int main() { int n; scanf(\"%d\", &n); printf(n>0 && 1162261467 % n == 0 ? \"true\":\"false\"); }"
                },
                cases: [["27", "true", false], ["0", "false", false], ["9", "true", true], ["45", "false", true]]
            }
        ];

        for (const p of problems) {
            const problem = await Problem.create({
                title: p.title, description: p.description, constraints: p.constraints,
                difficulty: p.difficulty, editorialDescription: p.editorialDescription,
                editorialSolutions: p.editorialSolutions
            });
            if (topics[p.topic]) await problem.addTopic(topics[p.topic]);
            for (const c of p.cases) {
                await TestCase.create({ problemId: problem.id, input: c[0], expectedOutput: c[1], isHidden: c[2] });
            }
        }
        console.log("FULL SEEDING COMPLETE! 20 Problems with real data and solutions.");
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
seed();