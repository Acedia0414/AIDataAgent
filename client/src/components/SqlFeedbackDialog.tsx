import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

interface SqlFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
  explanation: string;
  onSubmitFeedback: (feedback: string) => void;
}

export function SqlFeedbackDialog({ 
  isOpen, 
  onClose, 
  sql, 
  explanation, 
  onSubmitFeedback 
}: SqlFeedbackDialogProps) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!feedback.trim()) {
      toast.error("请提供修改意见");
      return;
    }
    
    onSubmitFeedback(feedback);
    setFeedback("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>SQL 查询反馈</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* 当前 SQL 展示 */}
          <div>
            <h4 className="font-medium mb-2">当前生成的 SQL：</h4>
            <div className="max-h-[40vh] overflow-auto border rounded-md">
              <pre className="bg-gray-100 p-3 text-sm whitespace-pre-wrap break-words">
                {sql}
              </pre>
            </div>
          </div>

          {/* AI 解释 */}
          <div>
            <h4 className="font-medium mb-2">AI 解释：</h4>
            <div className="max-h-[30vh] overflow-auto p-3 border rounded-md bg-blue-50">
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{explanation}</p>
            </div>
          </div>

          {/* 用户反馈输入 */}
          <div className="flex-shrink-0">
            <h4 className="font-medium mb-2">修改意见：</h4>
            <Textarea
              placeholder="请描述需要如何修改 SQL 查询，例如：
- 需要添加其他字段
- 需要修改筛选条件  
- 需要更改排序方式
- 需要关联其他表"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            提交反馈
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
