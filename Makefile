.PHONY: all
all: gopherc gopherc.exe

gopherc: gopherc.go ipc_linux.go
	GOOS=linux GOARCH=amd64 go build -o $@

gopherc.exe: gopherc.go ipc_windows.go
	GOOS=windows GOARCH=amd64 go build -o $@

.PHONY: clean
clean:
	$(RM) gopherc.exe gopherc
