import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import KnowledgeBase from "./pages/KnowledgeBase";
import ConnectionTest from "./pages/ConnectionTest";
import Chat from "./pages/Chat";
import Metadata from "./pages/Metadata";
import MetadataViewer from "./pages/MetadataViewer";
import QueryHistory from './pages/QueryHistory';
import ExecutionHistory from "@/pages/ExecutionHistory";
import ExecutionAnalytics from "@/pages/ExecutionAnalytics";
import RetryLimitSettings from "@/pages/RetryLimitSettings";
import Settings from "./pages/Settings";
import RAGProgress from "./pages/RAGProgress";
import LLMSettings from "./pages/LLMSettings";
import DatabaseSettings from "./pages/DatabaseSettings";
import Admin from "./pages/Admin";
import TableRules from "./pages/TableRules";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/knowledge-base"} component={KnowledgeBase} />
      <Route path={"/rag-progress"} component={RAGProgress} />
      <Route path={"/db-connection"} component={ConnectionTest} />
      <Route path={"/chat"} component={Chat} />
      <Route path={"/chat/:id"} component={Chat} />
      <Route path={"/metadata"} component={Metadata} />
      <Route path={"/metadata-viewer"} component={MetadataViewer} />
      <Route path={"/history"} component={QueryHistory} />
      <Route path="/execution-history" component={ExecutionHistory} />
      <Route path="/execution-analytics" component={ExecutionAnalytics} />
      <Route path="/retry-limit-settings" component={RetryLimitSettings} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/table-rules"} component={TableRules} />
      <Route path={"/llm-settings"} component={LLMSettings} />
      <Route path={"/database-settings"} component={DatabaseSettings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
