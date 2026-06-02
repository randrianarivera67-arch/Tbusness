content = open('index.js').read()
lines = content.split('\n')
for i, line in enumerate(lines[115:145], 115):
    print(f"{i}: {line}")
