import DocumentComment from "@/components/document/DocumentComment";
import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";

/**
 * TODO: retrieve documents from server instead of hardcoding
 */

const sampleData = {
    names: [
        "Alex Thompson",
        "Maria Garcia",
        "James Wilson",
        "Sarah Chen",
        "Mohammed Ahmed",
        "Emma Parker",
        "David Kim",
        "Lisa Patel"
    ],
    comments: [
        "Really insightful document! The analysis is spot-on and well-researched.",
        "Good points overall, though I think section 3 could use more detail.",
        "Excellent work! The methodology is clearly explained and the results are compelling.",
        "Interesting perspective, but I'd like to see more real-world examples.",
        "Great document, especially the conclusions. Very well structured.",
        "The diagrams really help explain the concepts. Well done!",
        "Solid analysis, though I have some questions about the assumptions made.",
        "This is exactly what I was looking for. Very comprehensive!"
    ],
    voteCounts: [0, 1, 2, 3, 4, 5]
};

const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

export default function DocumentCommentSection() {
    // Generate 6 random comments
    const comments = Array.from({ length: 6 }, () => ({
        author: getRandomItem(sampleData.names),
        content: getRandomItem(sampleData.comments),
        initialVotes: getRandomItem(sampleData.voteCounts)
    }));

    return (
        <>
            <div className="space-y-4 py-2.5">
                <div className="h-8"></div>
                {/*Allow users to add comments*/}
                <AddDocumentCommentBox />

                {/*Display existing comments*/}
                {comments.map((comment, index) => (
                    <DocumentComment
                        key={index}
                        author={comment.author}
                        content={comment.content}
                        initialVotes={comment.initialVotes}
                    />
                ))}
            </div>
        </>
    );
}