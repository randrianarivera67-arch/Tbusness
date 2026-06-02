content = open('index.js').read()
lines = content.split('\n')

# Esorina ny lines 128-170 (buyIntent block)
new_lines = lines[:127] + ['    // Groq mihitsy no mamaly messages rehetra'] + lines[170:]
open('index.js', 'w').write('\n'.join(new_lines))
print('Vita! Lines 128-170 esorina')
