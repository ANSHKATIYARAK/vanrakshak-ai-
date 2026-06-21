import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix

class ResearchValidationSuite:
    def __init__(self):
        self.results = []

    def log_test_case(self, scenario, ground_truth, prediction, confidence, latency_ms):
        self.results.append({
            "scenario": scenario,
            "ground_truth": ground_truth,
            "prediction": prediction,
            "confidence": confidence,
            "latency_ms": latency_ms
        })

    def calculate_metrics(self):
        df = pd.DataFrame(self.results)
        y_true = df['ground_truth']
        y_pred = df['prediction']
        
        precision = precision_score(y_true, y_pred)
        recall = recall_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred)
        avg_latency = df['latency_ms'].mean()
        
        print("--- VANRAKSHAK-X RESEARCH METRICS ---")
        print(f"Precision: {precision:.4f}")
        print(f"Recall:    {recall:.4f}")
        print(f"F1 Score:  {f1:.4f}")
        print(f"Avg Latency: {avg_latency:.2f}ms")
        print("-------------------------------------")
        
        return {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "latency": avg_latency
        }

if __name__ == "__main__":
    suite = ResearchValidationSuite()
    
    # Simulate some test cases for research validation
    # Scenario: Chainsaw Near Node
    suite.log_test_case("Chainsaw Near", 1, 1, 0.98, 450)
    # Scenario: Heavy Wind (False Positive Test)
    suite.log_test_case("Heavy Wind", 0, 0, 0.12, 380)
    # Scenario: Distant Chainsaw
    suite.log_test_case("Distant Chainsaw", 1, 1, 0.85, 520)
    # Scenario: Rain (Adaptive Threshold Test)
    suite.log_test_case("Rain", 0, 0, 0.05, 410)
    # Scenario: Axe Strike
    suite.log_test_case("Axe Strike", 1, 1, 0.78, 600)
    
    metrics = suite.calculate_metrics()
