import { TrendingUp, BookOpen, Target, CheckCircle2, Moon, Tag } from "lucide-react";

type WeeklyRecapProps = {
  recap: {
    newSavesThisWeek: number;
    reviewedThisWeek: number;
    projectsStarted: number;
    projectsCompleted: number;
    itemsGoneDormant: number;
    topTagsThisWeek: string[];
  };
};

export function WeeklyRecap({ recap }: WeeklyRecapProps) {
  const hasActivity = recap.newSavesThisWeek > 0 || recap.reviewedThisWeek > 0 || recap.projectsStarted > 0 || recap.projectsCompleted > 0;

  return (
    <div className="weekly-recap">
      <div className="weekly-recap-header">
        <TrendingUp size={18} />
        <span>This Week</span>
      </div>

      {!hasActivity ? (
        <p className="weekly-recap-empty">
          You haven't opened Knowhere in a while. Here's what's waiting for you.
        </p>
      ) : (
        <div className="weekly-recap-stats">
          {recap.newSavesThisWeek > 0 && (
            <div className="weekly-recap-stat">
              <BookOpen size={14} />
              <span><strong>{recap.newSavesThisWeek}</strong> saved</span>
            </div>
          )}
          {recap.reviewedThisWeek > 0 && (
            <div className="weekly-recap-stat">
              <Target size={14} />
              <span><strong>{recap.reviewedThisWeek}</strong> reviewed</span>
            </div>
          )}
          {recap.projectsStarted > 0 && (
            <div className="weekly-recap-stat">
              <TrendingUp size={14} />
              <span><strong>{recap.projectsStarted}</strong> started</span>
            </div>
          )}
          {recap.projectsCompleted > 0 && (
            <div className="weekly-recap-stat">
              <CheckCircle2 size={14} color="var(--success)" />
              <span><strong>{recap.projectsCompleted}</strong> completed</span>
            </div>
          )}
          {recap.itemsGoneDormant > 0 && (
            <div className="weekly-recap-stat muted">
              <Moon size={14} />
              <span><strong>{recap.itemsGoneDormant}</strong> went dormant</span>
            </div>
          )}
        </div>
      )}

      {recap.topTagsThisWeek.length > 0 && (
        <div className="weekly-recap-tags">
          <Tag size={12} />
          <span>Active topics: </span>
          {recap.topTagsThisWeek.map(tag => (
            <span key={tag} className="weekly-recap-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
