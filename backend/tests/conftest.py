import os

# Set APP_ENV to staging for all tests so that dev fallback is bypassed 
# and real authentication checks are tested correctly.
os.environ["APP_ENV"] = "staging"
