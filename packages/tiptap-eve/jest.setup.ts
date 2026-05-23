// TipTap (via @tiptap/core / prosemirror) registers timers on module load.
// Replacing them with Jest fakes prevents open-handle warnings at exit.
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});
