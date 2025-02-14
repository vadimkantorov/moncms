LEXICALVER = 0.24.0

init:
	curl -L https://github.com/facebook/lexical/archive/refs/tags/v$(LEXICALVER).tar.gz | tar -xzf - --strip-components=3 lexical-$(LEXICALVER)/examples/react-rich
