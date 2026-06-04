content = open('index.js').read()
lines = content.split('\n')
for i, line in enumerate(lines[155:185], 155):
    print(f"{i}: {line}")
