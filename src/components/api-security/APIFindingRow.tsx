import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface APIFindingRowProps {
  finding: any;
  isExpanded: boolean;
  onToggle: () => void;
  expandedContent: React.ReactNode;
}

export const APIFindingRow = ({ 
  finding, 
  isExpanded, 
  onToggle,
  expandedContent 
}: APIFindingRowProps) => {
  const [checkedBranches, setCheckedBranches] = useState<string[]>([]);

  const methodColors: Record<string, string> = {
    GET: "success",
    POST: "info",
    PUT: "warning",
    DELETE: "destructive",
    PATCH: "secondary"
  };

  const getGitHubRawUrl = (repoUrl: string, filePath: string, branch: string) => {
    // Convert GitHub web URL to raw content URL
    return repoUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/') + 
      `/${branch}/${filePath}`;
  };

  const getCorrectBranchUrl = async () => {
    const branches = ['main', 'master', 'develop'];
    const uncheckedBranches = branches.filter(b => !checkedBranches.includes(b));
    
    for (const branch of uncheckedBranches) {
      try {
        const rawUrl = getGitHubRawUrl(finding.repository_url, finding.file_path, branch);
        const response = await fetch(rawUrl);
        
        if (response.ok) {
          setCheckedBranches(prev => [...prev, branch]);
          return `${finding.repository_url}/blob/${branch}/${finding.file_path}#L${finding.line_number}`;
        }
      } catch (error) {
        console.error(`Error checking branch ${branch}:`, error);
      }
    }
    
    return `${finding.repository_url}/blob/main/${finding.file_path}#L${finding.line_number}`;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const url = await getCorrectBranchUrl();
    window.open(url, '_blank');
  };

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          {finding.repository_owner}/{finding.repository_name}
        </TableCell>
        <TableCell>
          <a 
            href="#"
            onClick={handleClick}
            className="text-primary hover:underline"
          >
            {finding.api_path}
          </a>
        </TableCell>
        <TableCell>
          <Badge variant={methodColors[finding.method.toUpperCase()] as any || "secondary"}>
            {finding.method}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {finding.file_path}:{finding.line_number}
          </span>
        </TableCell>
        <TableCell>
          {finding.api_security_issues?.length || 0} issues found
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            {expandedContent}
          </TableCell>
        </TableRow>
      )}
    </>
  );
};