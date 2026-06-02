content = open('index.js').read()
lines = content.split('\n')
# Esorina ny line 128 (index 127) izay misy "}" tavela
new_lines = lines[:127] + lines[128:]
open('index.js', 'w').write('\n'.join(new_lines))
print('Vita!')
