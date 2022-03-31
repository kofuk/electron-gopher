// This file is taken from `wgctrl' to support named pipe lookup on Windows.
// https://github.com/WireGuard/wgctrl-go
//
// MIT License
//
// Copyright (C) 2018-2019 Matt Layher
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

package main

import (
	"strings"

	"golang.org/x/sys/windows"
)

// Expected prefixes when dealing with named pipes.
const (
	pipePrefix = `\\.\pipe\`
)

// findNamedPipes looks for Windows named pipes that match the specified
// search string prefix.
func findNamedPipes(search string) ([]string, error) {
	var (
		pipes []string
		data  windows.Win32finddata
	)

	// Thanks @zx2c4 for the tips on the appropriate Windows APIs here:
	// https://א.cc/dHGpnhxX/c.
	h, err := windows.FindFirstFile(
		// Append * to find all named pipes.
		windows.StringToUTF16Ptr(pipePrefix+"*"),
		&data,
	)
	if err != nil {
		return nil, err
	}

	// FindClose is used to close file search handles instead of the typical
	// CloseHandle used elsewhere, see:
	// https://docs.microsoft.com/en-us/windows/desktop/api/fileapi/nf-fileapi-findclose.
	defer windows.FindClose(h)

	// Check the first file's name for a match, but also keep searching for
	// WireGuard named pipes until no more files can be iterated.
	for {
		name := windows.UTF16ToString(data.FileName[:])
		if strings.HasPrefix(name, search) {
			// Concatenate strings directly as filepath.Join appears to break the
			// named pipe prefix convention.
			pipes = append(pipes, pipePrefix+name)
		}

		if err := windows.FindNextFile(h, &data); err != nil {
			if err == windows.ERROR_NO_MORE_FILES {
				break
			}

			return nil, err
		}
	}

	return pipes, nil
}
