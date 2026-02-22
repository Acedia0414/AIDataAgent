import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface QueryFeedbackProps {
  queryId?: string;
  naturalLanguageQuery: string;
  generatedSql: string;
  onFeedbackSubmitted?: (satisfied: boolean) => void;
}

export function QueryFeedback({ 
  queryId, 
  naturalLanguageQuery, 
  generatedSql, 
  onFeedbackSubmitted 
}: QueryFeedbackProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = trpc.query.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      setIsSubmitting(false);
      onFeedbackSubmitted?.(feedback === true);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const handleFeedback = (satisfied: boolean) => {
    setFeedback(satisfied);
    setShowComment(!satisfied); // 只有不满意时才显示评论框
    
    // 如果满意，直接提交
    if (satisfied) {
      submitFeedbackMutation(satisfied, "");
    }
  };

  const submitFeedbackMutation = (satisfied: boolean, commentText: string) => {
    setIsSubmitting(true);
    submitFeedback.mutate({
      queryId: queryId || undefined,
      naturalLanguageQuery,
      generatedSql,
      satisfied,
      comment: commentText,
    });
  };

  const handleCommentSubmit = () => {
    if (feedback !== null) {
      submitFeedbackMutation(feedback, comment);
    }
  };

  if (feedback !== null) {
    return (
      <Card className="mt-3 border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              feedback 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {feedback ? (
                <>
                  <ThumbsUp className="h-4 w-4" />
                  Satisfied
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4" />
                  Needs Improvement
                </>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {feedback 
                ? "Great! We'll save this query for future reference." 
                : "Thank you for your feedback. We'll use this to improve our system."
              }
            </span>
          </div>
          
          {!feedback && showComment && (
            <div className="mt-3 space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional: Tell us what went wrong..."
                className="w-full p-2 border rounded-md text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting}
                  size="sm"
                  variant="outline"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
                <Button
                  onClick={() => setFeedback(null)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-3 border-l-4 border-l-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Was this query result helpful?</span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleFeedback(true)}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Yes
            </Button>
            <Button
              onClick={() => handleFeedback(false)}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              No
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
