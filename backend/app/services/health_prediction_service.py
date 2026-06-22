import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class RepositoryHealthPredictor(ABC):
    """
    Abstract interface for repository health prediction models.
    Can be implemented deterministically or using Machine Learning models in the future.
    """
    @abstractmethod
    def predict(
        self,
        commits: Dict[str, Any],
        contributors: Dict[str, Any],
        dependency_freshness: float,
        issue_activity: Dict[str, Any],
        releases: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predicts the repository health.
        Returns a dict:
        {
            "predicted_health": "Healthy" | "At Risk" | "Dormant" | "Abandoned",
            "confidence": float,
            "reasoning": str
        }
        """
        pass

class DeterministicHealthPredictor(RepositoryHealthPredictor):
    """
    Rule-based deterministic health prediction model.
    """
    def predict(
        self,
        commits: Dict[str, Any],
        contributors: Dict[str, Any],
        dependency_freshness: float,
        issue_activity: Dict[str, Any],
        releases: Dict[str, Any]
    ) -> Dict[str, Any]:
        
        days_ago = commits.get("last_commit_days_ago", 365)
        commits_1y = commits.get("commit_count_1y", 0)
        
        total_contribs = contributors.get("total_contributors", 1)
        active_contribs_90d = contributors.get("active_contributors_90d", 0)
        
        open_issues = issue_activity.get("open_issues", 0)
        stars = issue_activity.get("stars", 0)
        forks = issue_activity.get("forks", 0)
        popularity = stars + forks * 2
        
        tags_count = releases.get("tags_count", 0)
        
        # 1. Check for Abandoned
        if days_ago > 365 * 2: # No commits for 2+ years
            return {
                "predicted_health": "Abandoned",
                "confidence": 0.95,
                "reasoning": f"No commit activity recorded in the last {days_ago} days. The repository appears completely abandoned."
            }
        
        if days_ago > 365 and total_contribs <= 1: # Single developer, inactive for 1+ year
            return {
                "predicted_health": "Abandoned",
                "confidence": 0.90,
                "reasoning": f"Repository has been inactive for {days_ago} days and was maintained by a single contributor. It is likely abandoned."
            }
            
        if commits_1y == 0 and total_contribs <= 1 and days_ago > 300:
            return {
                "predicted_health": "Abandoned",
                "confidence": 0.85,
                "reasoning": "No commits in the past year, single developer history, and long-term inactivity (>300 days) points to abandonment."
            }

        # 2. Check for Dormant
        if days_ago > 365: # Inactive for 1+ year, but multiple developers or some releases
            return {
                "predicted_health": "Dormant",
                "confidence": 0.80,
                "reasoning": f"No commits in the last {days_ago} days. However, the repository has a history of multiple contributors ({total_contribs}), indicating it is dormant rather than fully abandoned."
            }
            
        if days_ago >= 180 and commits_1y < 3:
            return {
                "predicted_health": "Dormant",
                "confidence": 0.85,
                "reasoning": f"Low maintenance activity (only {commits_1y} commits in the last year) and no recent commits for {days_ago} days suggests the project is dormant."
            }

        # 3. Check for At Risk
        # Warning signs for active/recent projects (last commit < 180 days ago)
        warning_signs = []
        if total_contribs <= 1:
            warning_signs.append("Single contributor dependency (bus factor of 1).")
        if tags_count == 0:
            warning_signs.append("No release versions or stable tags cataloged.")
        if dependency_freshness < 45.0:
            warning_signs.append(f"Outdated dependencies (freshness index is low at {dependency_freshness}%).")
        if open_issues > 15 and (open_issues / (popularity + 5.0) > 0.5):
            warning_signs.append(f"Growing maintenance backlog ({open_issues} open issues relative to low community engagement).")

        if len(warning_signs) >= 2:
            reasons = " ".join(warning_signs)
            confidence = min(0.90, 0.55 + 0.10 * len(warning_signs))
            return {
                "predicted_health": "At Risk",
                "confidence": round(confidence, 2),
                "reasoning": f"Project is recently active (last commit {days_ago} days ago) but faces survivability threats: {reasons}"
            }

        # 4. Fallback to Healthy
        healthy_conf = 1.0
        reasons_list = []
        
        if total_contribs > 2:
            reasons_list.append("collaborative developer base")
        if active_contribs_90d > 0:
            reasons_list.append("recent contribution activity")
        if dependency_freshness > 70.0:
            reasons_list.append("up-to-date dependency constraints")
        else:
            healthy_conf -= 0.15
            
        if tags_count > 0:
            reasons_list.append("stable version releases")
        else:
            healthy_conf -= 0.10
            
        if open_issues > 0:
            healthy_conf -= min(0.15, open_issues * 0.005)
            
        reasoning_str = "Project displays stable health indicators, featuring " + ", ".join(reasons_list) + "." if reasons_list else "Project shows standard maintenance indicators."
        
        return {
            "predicted_health": "Healthy",
            "confidence": round(max(0.60, healthy_conf), 2),
            "reasoning": reasoning_str
        }

class HealthPredictionService:
    def __init__(self, predictor: RepositoryHealthPredictor = None):
        self.predictor = predictor or DeterministicHealthPredictor()

    def predict_health(
        self,
        commits: Dict[str, Any],
        contributors: Dict[str, Any],
        dependency_freshness: float,
        issue_activity: Dict[str, Any],
        releases: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Classifies the health of the repository using the configured predictor.
        """
        try:
            return self.predictor.predict(
                commits=commits,
                contributors=contributors,
                dependency_freshness=dependency_freshness,
                issue_activity=issue_activity,
                releases=releases
            )
        except Exception as e:
            logger.error(f"Error executing health prediction: {str(e)}")
            return {
                "predicted_health": "Healthy",
                "confidence": 0.5,
                "reasoning": f"Health prediction failed: {str(e)}. Defaulted to Healthy."
            }

health_prediction_service = HealthPredictionService()
