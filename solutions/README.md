# Reviewer Notes

This test is supposed to let a candidate **prove** that they can program, even if they have no formal education or relevant work experience. There are many promising  candidates who are possibly stuck in other careers and therefore have no other way of showing their skill. These candidates will appreciate a potentially long and complicated test (as opposed to more senior people) for a chance to get hired in this field despite their lack of formal credentials.

This test is designed with the following principles in mind:

- Candidates write code, on a computer, not brainteasers or whiteboard coding
- Candidates are given time to experiment with their solution without somebody looking over their shoulder
- The test is similar to real-life work, as opposed to algorithms or unrealistic nonsense
- The test tests fundamentals, not the framework du jour
- We want smart people that can figure things out, not people who possess thorough trivia knowledge of any one programming language
- The programming language they know or prefer is irrelevant
- There should be multiple levels of sophistication in the solution that let us gauge the applicant's seniority

## Messages

The first challenge "_Messages_" is inspired by our variables system. It is relatively straightforward -- if a bit finnicky -- to solve for a candidate that is familiar with regular expressions (or is smart enough to google their way there quickly). Regular expressions are something that I expect a developer worth their salt to know enough to figure this problem out. 

Be sure to ask the applicant about the performance characteristics of fetching the state for every found variable if they do that (this could be very slow!), potential memory issues if they fetch all of them at once, and if there could be any good compromises, such as a *least-recently-used* cache.

## Search

The second problem "_Search_" is based on our actual block search and some of its challenges. The main idea behind it is to see if the candidate can figure out how to traverse deeply nested maps. This is tricky and best solved with a recursive approach. The recursion is (probably) not necessary, but it's a good proxy for somebody that has been programming for a while, because sooner or later we all run into a problem like this, so if the candidate can solve it - especially recursively - we can be sure that they are experienced. The database is deliberately a little awkwardly designed, because we want to get the candidate to join the two tables.


## Test notes
I have personally found that you cannot give a candidate too much help. "Have you tried recursively calling the function?" could be the poke a good candidate needs, but it will never ever help a bad candidate. Generally, I suggest giving the candidate room to experiment without feeling watched (and judged), but to drop in every half an hour or so, have the candidate explain their thinking, and help them along a little. That will give you a good idea what it is like to work with that person and what their skill level is.
