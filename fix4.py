import re
content = open('index.js').read()

# Jereo ny line 129
lines = content.split('\n')
for i, line in enumerate(lines[125:140], 125):
    print(f"{i}: {line}")
