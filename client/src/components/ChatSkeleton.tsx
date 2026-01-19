import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
