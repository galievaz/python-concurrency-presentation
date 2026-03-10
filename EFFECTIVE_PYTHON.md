# Effective Python — Threads & Concurrency

Main topics related to threads and concurrency:

---

## 1. Prefer Queue for thread communication

Use `queue.Queue` to safely pass data between threads instead of sharing variables.

- **Why:** thread-safe, avoids race conditions, simplifies producer/consumer patterns
- **Typical pattern:** worker threads read tasks from a queue → process → push results to another queue

---

## 2. Use threads for I/O-bound tasks

Threads are useful when the program is waiting for external operations:

- network requests
- disk operations
- APIs
- database queries

During I/O wait, the GIL can be released, allowing other threads to run.

---

## 3. Avoid threads for CPU-bound work

CPU-heavy tasks should not rely on threads due to the GIL.

**Instead use:**
- `multiprocessing`
- `ProcessPoolExecutor`

---

## 4. Use concurrent.futures instead of low-level threading

Prefer high-level abstractions:

- `ThreadPoolExecutor`
- `ProcessPoolExecutor`

Instead of manually managing thread creation, locking, synchronization.

**Reason:** less boilerplate and fewer bugs.

---

## 5. Be careful with shared state

Common thread problems:

- race conditions
- deadlocks
- inconsistent state

**Advice:**
- minimize shared data
- prefer message passing (queues)
- use locks only when necessary

---

## 6. Pipelines with threads

Pattern: download thread → parse thread → save thread

Each stage communicates via queues. Improves throughput for I/O workflows.

---

## Summary

| Rule | Use |
|------|-----|
| I/O tasks | threads |
| CPU-heavy work | multiprocessing |
| Communication | queues |
| Abstraction | ThreadPoolExecutor |
