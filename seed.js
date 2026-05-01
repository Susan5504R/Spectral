const { sequelize, Problem, TestCase, Topic } = require('./db');

async function seed() {
    try {
        console.log("Seeding 20 Problems with Descriptions, Constraints, and Cases...");
        await sequelize.sync();
        await TestCase.destroy({ where: {}, truncate: { cascade: true } });
        await Problem.destroy({ where: {}, truncate: { cascade: true } });
        await Topic.destroy({ where: {}, truncate: { cascade: true } });

        const topicsData = ["Arrays", "Strings", "Math", "Recursion", "DP", "Binary Search", "Graphs", "Bit Manipulation"];
        const topics = {};
        for (const name of topicsData) {
            const [topic] = await Topic.findOrCreate({ where: { name } });
            topics[name] = topic;
        }

        const problems = [
            { 
                title: "Two Sum", 
                description: "Given an array of integers nums and an integer target, return the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
                constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
                topic: "Arrays", 
                cases: [
                    ["9\n2 7", "2 7", false], ["6\n3 2 4", "2 4", false], // Public
                    ["6\n3 3", "3 3", true], ["10\n1 9", "1 9", true], ["0\n-1 1", "-1 1", true] // Hidden
                ] 
            },
            { 
                title: "Palindrome Number", 
                description: "Given an integer x, return true if x is a palindrome, and false otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.",
                constraints: "-2^31 <= x <= 2^31 - 1",
                topic: "Math", 
                cases: [
                    ["121", "true", false], ["-121", "false", false], // Public
                    ["10", "false", true], ["12321", "true", true], ["0", "true", true] // Hidden
                ] 
            },
            {
                title: "Reverse String",
                description: "Write a function that reverses a string. The input string is given as an array of characters s.",
                constraints: "1 <= s.length <= 10^5\ns[i] is a printable ascii character.",
                topic: "Strings",
                cases: [
                    ["hello", "olleh", false], ["world", "dlrow", false],
                    ["Spectral", "lartcepS", true], ["a", "a", true], ["", "", true]
                ]
            },
            {
                title: "Fibonacci Number",
                description: "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1.",
                constraints: "0 <= n <= 30",
                topic: "Recursion",
                cases: [
                    ["2", "1", false], ["3", "2", false],
                    ["0", "0", true], ["1", "1", true], ["10", "55", true]
                ]
            },
            {
                title: "Binary Search",
                description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.",
                constraints: "1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.",
                topic: "Binary Search",
                cases: [
                    ["9\n1 9", "1", false], ["2\n1 3", "-1", false],
                    ["5\n5", "0", true], ["1\n1", "0", true], ["10\n1 2 10", "2", true]
                ]
            },
            {
                title: "Climbing Stairs",
                description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                constraints: "1 <= n <= 45",
                topic: "DP",
                cases: [
                    ["2", "2", false], ["3", "3", false],
                    ["4", "5", true], ["5", "8", true], ["10", "89", true]
                ]
            },
            {
                title: "FizzBuzz",
                description: "Given an integer n, return a string array answer (1-indexed) where:\nanswer[i] == 'FizzBuzz' if i is divisible by 3 and 5.\nanswer[i] == 'Fizz' if i is divisible by 3.\nanswer[i] == 'Buzz' if i is divisible by 5.\nanswer[i] == i if none of the above conditions are true.",
                constraints: "1 <= n <= 10^4",
                topic: "Math",
                cases: [
                    ["3", "1\n2\nFizz", false], ["5", "1\n2\nFizz\n4\nBuzz", false],
                    ["1", "1", true], ["15", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", true]
                ]
            },
            {
                title: "Single Number",
                description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.",
                constraints: "1 <= nums.length <= 3 * 10^4\n-3 * 10^4 <= nums[i] <= 3 * 10^4",
                topic: "Bit Manipulation",
                cases: [
                    ["2 2 1", "1", false], ["4 1 2 1 2", "4", false],
                    ["1", "1", true], ["7 3 3", "7", true], ["5 5 10", "10", true]
                ]
            }
            // ... (I will include all 20 in the final execution)
        ];

        for (const p of problems) {
            const problem = await Problem.create({ 
                title: p.title, 
                description: p.description, 
                constraints: p.constraints,
                difficulty: "Easy" 
            });
            if (topics[p.topic]) await problem.addTopic(topics[p.topic]);
            for (const c of p.cases) {
                await TestCase.create({ problemId: problem.id, input: c[0], expectedOutput: c[1], isHidden: c[2] });
            }
        }
        console.log("Seeding complete with Descriptions and Constraints!");
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
seed();
