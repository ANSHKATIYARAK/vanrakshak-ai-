import librosa
import numpy as np
import os
import glob

def extract_mfcc(file_path, max_pad_len=40):
    try:
        audio, sample_rate = librosa.load(file_path, res_type='kaiser_fast')
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
        
        # Pad or truncate
        if mfccs.shape[1] > max_pad_len:
            mfccs = mfccs[:, :max_pad_len]
        else:
            pad_width = max_pad_len - mfccs.shape[1]
            mfccs = np.pad(mfccs, pad_width=((0, 0), (0, pad_width)), mode='constant')
            
        return mfccs
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def process_directory(directory, label):
    features = []
    labels = []
    files = glob.glob(os.path.join(directory, "*.wav"))
    
    for file in files:
        data = extract_mfcc(file)
        if data is not None:
            features.append(data)
            labels.append(label)
            
    return np.array(features), np.array(labels)

if __name__ == "__main__":
    # Placeholder for actual data processing
    print("Preprocessing script ready. Define dataset paths to begin.")
    # Example:
    # X_chainsaw, y_chainsaw = process_directory("data/chainsaw", 1)
    # X_ambient, y_ambient = process_directory("data/ambient", 0)
