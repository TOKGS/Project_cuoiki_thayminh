import kagglehub

# Download latest version
path = kagglehub.dataset_download("brjapon/cwru-bearing-datasets")

print("Path to dataset files:", path)
