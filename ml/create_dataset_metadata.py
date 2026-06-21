import pandas as pd
import os

def create_dataset_template():
    columns = [
        "file_id", "label", "sub_label", "environment", 
        "snr_db", "duration_sec", "recorded_at", "node_type"
    ]
    
    data = [
        ["CH-001", "chainsaw", "mechanical", "dense_forest", 15, 10.0, "2026-05-12", "VR-X-S3"],
        ["AX-042", "axe_strike", "manual", "open_forest", 8, 5.0, "2026-05-12", "VR-X-S3"],
        ["AM-101", "ambient", "birds", "river_bank", 30, 60.0, "2026-05-11", "VR-X-S3"],
        ["SL-501", "silence", "anomaly", "high_altitude", 45, 30.0, "2026-05-10", "VR-X-S3"],
        ["RN-202", "rain", "weather", "tropical", 5, 120.0, "2026-05-09", "VR-X-S3"]
    ]
    
    df = pd.DataFrame(data, columns=columns)
    df.to_csv("vanrakshak_forest_dataset_v1.csv", index=False)
    print("Dataset template 'vanrakshak_forest_dataset_v1.csv' created.")

if __name__ == "__main__":
    create_dataset_template()
