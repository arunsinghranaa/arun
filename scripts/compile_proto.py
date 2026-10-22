"""Compile Protocol Buffer .proto files into Python gRPC stubs."""

from pathlib import Path
import sys
from grpc_tools import protoc

BASE_DIR = Path(__file__).resolve().parent.parent
PROTO_DIR = BASE_DIR / "proto"


def compile_protos():
    print(f"Compiling Protocol Buffer schemas in: {PROTO_DIR}")
    proto_files = list(PROTO_DIR.glob("*.proto"))
    if not proto_files:
        print("No .proto files found.")
        return 1

    for proto_file in proto_files:
        print(f"Compiling {proto_file.name}...")
        cmd = [
            "grpc_tools.protoc",
            f"-I{BASE_DIR}",
            f"--python_out={BASE_DIR}",
            f"--pyi_out={BASE_DIR}",
            f"--grpc_python_out={BASE_DIR}",
            str(proto_file),
        ]
        res = protoc.main(cmd)
        if res != 0:
            print(f"Failed to compile {proto_file.name}")
            return res

        # Ensure grpc.experimental is imported so static analysis and runtime methods resolve cleanly
        grpc_file = PROTO_DIR / f"{proto_file.stem}_pb2_grpc.py"
        if grpc_file.is_file():
            content = grpc_file.read_text(encoding="utf-8")
            if "import grpc.experimental" not in content:
                content = content.replace("import grpc\n", "import grpc\nimport grpc.experimental\n", 1)
                grpc_file.write_text(content, encoding="utf-8")

    print("All Protocol Buffer schemas compiled successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(compile_protos())

