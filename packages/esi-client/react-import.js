// FIXME: add fix: https://github.com/egoist/tsup/issues/390#issuecomment-933488738
// This should not be required here because it should not depend on React!
// Once we move the hooks out of this package, we can probably remove this.
import React from "react";

export { React };
