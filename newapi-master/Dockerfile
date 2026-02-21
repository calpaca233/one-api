FROM golang:alpine AS builder

ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOPROXY=https://goproxy.cn,direct

WORKDIR /build
ADD go.mod go.sum ./
RUN go mod download

COPY . .

# 接收版本参数
ARG VERSION
RUN go build -ldflags "-s -w -X 'one-api/common.Version=${VERSION}'" -o one-api


FROM alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates \
    && mkdir -p /app/logs

ENV TZ=Asia/Shanghai

COPY --from=builder /build/one-api /
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/one-api"]
