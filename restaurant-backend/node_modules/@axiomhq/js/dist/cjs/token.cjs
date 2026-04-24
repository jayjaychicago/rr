'use strict';

function isAxiomPersonalToken(token) {
    if (token.startsWith("xapt")) {
        return true;
    }
    return false;
}

exports.isAxiomPersonalToken = isAxiomPersonalToken;
//# sourceMappingURL=token.cjs.map
