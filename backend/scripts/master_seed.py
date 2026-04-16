"""Master seed orchestrator for backend/scripts.

This script discovers seed/fix/vector scripts and runs them in a logical order.

Usage examples:
    python scripts/master_seed.py
    python scripts/master_seed.py --with-yok-fetch --with-ingest-docs
    python scripts/master_seed.py --vector-mode konya
    python scripts/master_seed.py --vector-mode skip --skip-admin
"""

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


BACKEND_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Task:
    file_name: str
    label: str
    category: str
    enabled_by_default: bool = True
    args: tuple[str, ...] = ()


ALL_TASKS: tuple[Task, ...] = (
    # Optional remote source refresh
    Task("fetch_yok_universities.py", "YOK universite cekimi", "db", enabled_by_default=False),

    # Core hierarchy and base data
    Task("seed_konya.py", "Konya universite/fakulte/bolum seed", "db"),
    Task("seed_data.py", "Temel universite + test user seed", "db"),
    Task("seed_kgtu_manual.py", "KGTU manuel takvim + ders programi", "db"),
    Task("seed_my_schedule.py", "Ornek ogrenci ders programi", "db"),

    # Data normalization/fixes
    Task("fix_university_names.py", "Universite adi duzeltme", "fix"),
    Task("fix_calendar_types.py", "Takvim event_type normalize", "fix"),

    # Vector updates (mode-controlled)
    Task("vector_seed.py", "Tum universiteler vector seed", "vector"),
    Task("vector_seed_konya.py", "Konya universiteleri vector seed", "vector", enabled_by_default=False),
    Task("ingest_docs.py", "Resmi dokuman ingest", "vector", enabled_by_default=False),

    # Last-mile role assignment
    Task("make_admin.py", "Hedef kullaniciyi admin yap", "admin", enabled_by_default=False),
)


TEST_ACCOUNTS: tuple[tuple[str, str, str], ...] = (
    ("admin", "admin@kampusplus.edu.tr", "Admin123!"),
    ("student", "student1@selcuk.edu.tr", "Student123!"),
    ("student", "student2@selcuk.edu.tr", "Student123!"),
)


def discover_scripts() -> dict[str, Path]:
    return {path.name: path for path in SCRIPTS_DIR.glob("*.py")}


def choose_tasks(args: argparse.Namespace, discovered: dict[str, Path]) -> list[Task]:
    selected: list[Task] = []

    for task in ALL_TASKS:
        if task.file_name not in discovered:
            continue

        if task.file_name == "fetch_yok_universities.py" and not args.with_yok_fetch:
            continue

        if task.file_name == "ingest_docs.py" and not args.with_ingest_docs:
            continue

        if task.file_name == "make_admin.py" and args.skip_admin:
            continue

        if task.file_name == "vector_seed.py" and args.vector_mode in {"konya", "skip"}:
            continue

        if task.file_name == "vector_seed_konya.py" and args.vector_mode in {"official", "skip"}:
            continue

        if task.category == "vector" and task.file_name == "ingest_docs.py" and args.vector_mode == "skip":
            continue

        if task.enabled_by_default:
            selected.append(task)

    return selected


def run_task(task: Task, discovered: dict[str, Path]) -> int:
    script_path = discovered[task.file_name]
    command = [sys.executable, str(script_path), *task.args]

    print("\n" + "=" * 78)
    print(f"[RUN] {task.label}")
    print(f"[CMD] {' '.join(command)}")
    print("=" * 78)

    completed = subprocess.run(command, cwd=str(BACKEND_ROOT), check=False)
    return completed.returncode


def print_discovered(discovered: dict[str, Path]) -> None:
    print("\nDiscovered scripts in backend/scripts:")
    for name in sorted(discovered):
        print(f"  - {name}")


def print_plan(tasks: Iterable[Task]) -> None:
    print("\nExecution plan:")
    for index, task in enumerate(tasks, start=1):
        print(f"  {index:02d}. [{task.category}] {task.file_name} -> {task.label}")


def print_run_summary(results: list[tuple[Task, int]]) -> None:
    print("\n" + "-" * 78)
    print("Run summary")
    print("-" * 78)
    for task, code in results:
        status = "OK" if code == 0 else "FAIL"
        print(f"[{status:4}] {task.file_name:<26} exit_code={code}")


def print_test_accounts_box() -> None:
    border = "+-" + "-" * 12 + "-+-" + "-" * 36 + "-+-" + "-" * 18 + "-+"
    print("\n" + border)
    print("| " + "ROL".ljust(12) + " | " + "E-POSTA".ljust(36) + " | " + "SIFRE".ljust(18) + " |")
    print(border)

    for role, email, password in TEST_ACCOUNTS:
        print("| " + role.ljust(12) + " | " + email.ljust(36) + " | " + password.ljust(18) + " |")

    print(border)
    print("Not: make_admin.py hedef hesabin rolunu admin yapar; sifresini degistirmez.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run all seed/fix/vector scripts in logical order")
    parser.add_argument(
        "--with-yok-fetch",
        action="store_true",
        help="fetch_yok_universities.py scriptini da calistir",
    )
    parser.add_argument(
        "--with-ingest-docs",
        action="store_true",
        help="ingest_docs.py scriptini da calistir",
    )
    parser.add_argument(
        "--vector-mode",
        choices=["official", "konya", "both", "skip"],
        default="official",
        help="Vector seed modu: official (default), konya, both, skip",
    )
    parser.add_argument(
        "--skip-admin",
        action="store_true",
        help="make_admin.py adimini atla",
    )
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Bir adim fail olursa sonraki adimlara devam et",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    discovered = discover_scripts()

    if not discovered:
        print("No scripts found under backend/scripts.")
        raise SystemExit(1)

    print_discovered(discovered)

    tasks = choose_tasks(args, discovered)

    if args.vector_mode == "both":
        # both modu icin official + konya adimlarinin ikisini de acikca ekle
        for extra in ("vector_seed.py", "vector_seed_konya.py"):
            if extra in discovered and all(t.file_name != extra for t in tasks):
                template = next(t for t in ALL_TASKS if t.file_name == extra)
                tasks.append(template)

    if args.with_ingest_docs and "ingest_docs.py" in discovered:
        if all(t.file_name != "ingest_docs.py" for t in tasks):
            tasks.append(next(t for t in ALL_TASKS if t.file_name == "ingest_docs.py"))

    if args.with_yok_fetch and "fetch_yok_universities.py" in discovered:
        if all(t.file_name != "fetch_yok_universities.py" for t in tasks):
            tasks.insert(0, next(t for t in ALL_TASKS if t.file_name == "fetch_yok_universities.py"))

    print_plan(tasks)

    results: list[tuple[Task, int]] = []

    for task in tasks:
        exit_code = run_task(task, discovered)
        results.append((task, exit_code))

        if exit_code != 0 and not args.continue_on_error:
            print(f"\n[ABORT] {task.file_name} failed with exit code {exit_code}.")
            print("Use --continue-on-error to keep running next tasks.")
            print_run_summary(results)
            print_test_accounts_box()
            raise SystemExit(exit_code)

    print_run_summary(results)
    print_test_accounts_box()


if __name__ == "__main__":
    main()
