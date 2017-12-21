require('dotenv').config();

const mongoose = require("mongoose");
const Thread = require("./thread");
const Answer = require("./answer");
const Comment = require("./comment");
const User = require("./user");

mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true}).then(() => {
    Thread.remove({});
    Answer.remove({});
    Comment.remove({});
    User.remove({});

    Thread.create({
        "_id": "5a3bc9c9d7f935190cb038d2",
        "title": "How do I replace all line breaks in a string with &lt;br /&gt; tags?",
        "question": "How can I read the line break from a value with Javascript and replace all the line breaks with br tags?<br /><br />Example:<br /><br />A variable passed from PHP as below:<br /><pre><code><br />  &#34;This is man.<br /><br />     Man like dog.<br />     Man like to drink.<br /><br />     Man is the king.&#34;<br /></pre></code><br />I would like my result to look something like this after the Javascript converts it:<br /><pre><code><br />  &#34;This is man&lt;br /&gt;&lt;br /&gt;Man like dog.&lt;br /&gt;Man like to drink.&lt;br /&gt;&lt;br /&gt;Man is the king.&#34;<br /></pre></code><br />",
        "author": "5a3bd22a89e9932060774b2a",
        "votedUIDs": [],
        "isPoll": false,
        "images": [],
        "tags": [
            "javascript"
        ],
        "answers": [
            "5a3bc9efd7f935190cb038d3",
            "5a3bca48d7f935190cb038d5"
        ],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "votes": 0,
        "isSolved": true,
        "creationDate": Date.now(),
        "__v": 4
    });
    Thread.create({
        "_id": "5a3bcab7d7f935190cb038d7",
        "title": "Jquery set checkbox checked",
        "question": "I already tried all the possible ways, but I still didn't get it working. I have a modal window with a checkbox I want that when the modal opens, the checkbox check or uncheck should be based on a database value. (I have that already working with others form fields.) I started trying to get it checked but it didn't work.<br /><br />My html div:<br /><br /><pre><code>&lt;div id=&#34;fModal&#34; class=&#34;modal&#34; &gt;<br />    ...<br />    &lt;div class=&#34;row-form&#34;&gt;<br />        &lt;div class=&#34;span12&#34;&gt;<br />            &lt;span class=&#34;top title&#34;&gt;Estado&lt;/span&gt;<br /><br />          &lt;input type=&#34;checkbox&#34;  id=&#34;estado_cat&#34; class=&#34;ibtn&#34;&gt;<br />       &lt;/div&gt;<br />    &lt;/div&gt;             <br />&lt;/div&gt;</pre></code><br /><br />and the jquery:<br /><br /><pre><code>$(&#34;#estado_cat&#34;).prop( &#34;checked&#34;, true );</pre></code>",
        "author": "5a3bd22a89e9932060774b2a",
        "votedUIDs": [],
        "isPoll": false,
        "images": [],
        "tags": [
            "jquery"
        ],
        "answers": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "votes": 0,
        "isSolved": false,
        "creationDate": Date.now(),
        "__v": 0
    });
    Thread.create({
        "_id": "5a3bcbd5d7f935190cb038d8",
        "title": "Which coding language do you prefer?",
        "question": "Your favorite language:",
        "author": "5a3bd22a89e9932060774b2a",
        "votedUIDs": [
            "5a3bc91a3d7b3a285c1f56c7"
        ],
        "isPoll": true,
        "images": [],
        "tags": [
            "howestles21-12-17"
        ],
        "answers": [
            "5a3bcbd5d7f935190cb038d9",
            "5a3bcbd5d7f935190cb038da",
            "5a3bcbd5d7f935190cb038db",
            "5a3bcbd5d7f935190cb038dc",
            "5a3bcbd5d7f935190cb038dd"
        ],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "votes": 0,
        "isSolved": false,
        "creationDate": Date.now(),
        "__v": 1
    });

    Answer.create({
        "_id": "5a3bc9efd7f935190cb038d3",
        "answer": "<pre><code><br />str = str.replace(/(?:\\r\\n|\\r|\\n)/g, '&lt;br /&gt;');<br /></pre></code>",
        "author": "5a3bd22a89e9932060774b2a",
        "onThread": "5a3bc9c9d7f935190cb038d2",
        "images": [],
        "comments": [
            "5a3bca64d7f935190cb038d6"
        ],
        "downVotedUIDs": [],
        "upVotedUIDs": [
            "5a3bc91a3d7b3a285c1f56c7"
        ],
        "isApproved": true,
        "votes": 1,
        "__v": 2
    });
    Answer.create({
        "_id": "5a3bca48d7f935190cb038d5",
        "answer": "Possible solution:",
        "author": "5a3bd22a89e9932060774b2a",
        "onThread": "5a3bc9c9d7f935190cb038d2",
        "images": [
            "data:image/png;base64,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"
        ],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "isApproved": false,
        "votes": 0,
        "__v": 0
    });
    Answer.create({
        "_id": "5a3bcbd5d7f935190cb038d9",
        "__v": 1,
        "onThread": "5a3bcbd5d7f935190cb038d8",
        "author": "5a3bd22a89e9932060774b2a",
        "answer": "javascript",
        "images": [],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [
            "5a3bc91a3d7b3a285c1f56c7"
        ],
        "isApproved": false,
        "votes": 1
    });
    Answer.create({
        "_id": "5a3bcbd5d7f935190cb038da",
        "__v": 0,
        "onThread": "5a3bcbd5d7f935190cb038d8",
        "author": "5a3bd22a89e9932060774b2a",
        "answer": "java",
        "images": [],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "isApproved": false,
        "votes": 0
    });
    Answer.create({
        "_id": "5a3bcbd5d7f935190cb038db",
        "__v": 0,
        "onThread": "5a3bcbd5d7f935190cb038d8",
        "author": "5a3bd22a89e9932060774b2a",
        "answer": "C#",
        "images": [],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "isApproved": false,
        "votes": 0
    });
    Answer.create({
        "_id": "5a3bcbd5d7f935190cb038dc",
        "__v": 0,
        "onThread": "5a3bcbd5d7f935190cb038d8",
        "author": "5a3bd22a89e9932060774b2a",
        "answer": "C",
        "images": [],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "isApproved": false,
        "votes": 0
    });
    Answer.create({
        "_id": "5a3bcbd5d7f935190cb038dd",
        "__v": 0,
        "onThread": "5a3bcbd5d7f935190cb038d8",
        "author": "5a3bd22a89e9932060774b2a",
        "answer": "Other",
        "images": [],
        "comments": [],
        "downVotedUIDs": [],
        "upVotedUIDs": [],
        "isApproved": false,
        "votes": 0
    });

    Comment.create({
        "_id": "5a3bca64d7f935190cb038d6",
        "comment": "Just additional note: str.replace(&#34;\\n&#34;, '&lt;br /&gt;') (first argument is a regular string) will replace only first occurrence",
        "author": "5a3bd22a89e9932060774b2a",
        "onAnswer": "5a3bc9efd7f935190cb038d3",
        "__v": 0
    });

    User.create({
        "_id": "5a3bd22a89e9932060774b2a",
        "displayName": "Quentin Bultinck",
        "email": "quentin.bultinck@student.howest.be",
        "domain": "student.howest.be",
        "googleId": 1.17667769291761e+20,
        "subscriptions": [],
        "badge": "fa fa-trophy badge-default 2x",
        "alias": "Quentin",
        "credits": 0,
        "approvedAnswers": 0,
        "comments": [],
        "answers": [],
        "threads": [],
        "isAdmin": true,
        "__v": 0
    });
}).catch(err => {
    console.error(err);
});