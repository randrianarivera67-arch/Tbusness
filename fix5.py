content = open('index.js').read()
lines = content.split('\n')
for i, line in enumerate(lines[125:175], 125):
    print(f"{i}: {line}")
