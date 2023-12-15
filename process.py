import json

with open("res/top-100000.txt", encoding="utf-8") as f:
    data = f.read().split("\n")

data = [line.split(" ")[0][1:-1] for line in data if line != ""]

with open("res/list.json", 'w', encoding="utf-8") as f:
    json.dump(data, f)