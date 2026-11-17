# Работа с Yandex Cloud Object Storage через boto3

## Содержание
1. [Введение](#введение)
2. [Установка](#установка)
3. [Настройка](#настройка)
4. [Аутентификация](#аутентификация)
5. [Основные операции](#основные-операции)
6. [Примеры использования](#примеры-использования)
7. [Обработка ошибок](#обработка-ошибок)
8. [Полезные ссылки](#полезные-ссылки)

---

## Введение

**boto3** — это комплект средств разработки (SDK) для Python, предназначенный для работы с AWS-совместимыми сервисами, включая Yandex Cloud Object Storage.

**Yandex Cloud Object Storage** — масштабируемое решение для хранения данных, совместимое с Amazon S3 API.

**Основные возможности:**
- Загрузка и скачивание файлов
- Управление бакетами
- Получение списка объектов
- Удаление объектов
- Работа с метаданными

---

## Установка

### Установка boto3

```bash
pip install boto3
```

или для установки в пользовательское окружение:

```bash
python3 -m pip install --user boto3
```

### Проверка установки

```python
import boto3
print(boto3.__version__)
```

---

## Настройка

### 1. Создание сервисного аккаунта

Перейдите в консоль Yandex Cloud и создайте сервисный аккаунт с необходимыми правами:
- `storage.editor` — для работы с конкретным бакетом
- `storage.admin` — для полного управления

### 2. Создание статического ключа доступа

В консоли Yandex Cloud создайте статический ключ доступа. Вы получите:
- **Key ID** (Идентификатор ключа)
- **Secret Key** (Секретный ключ)

⚠️ **Важно:** Сохраните эти данные в надёжном месте. Повторное получение секретного ключа невозможно.

### 3. Настройка credentials (опционально)

Создайте директорию для хранения учётных данных:

**macOS/Linux:**
```bash
mkdir -p ~/.aws/
```

**Windows:**
```cmd
mkdir C:\Users\<имя_пользователя>\.aws\
```

Создайте файл `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

Создайте файл `~/.aws/config`:

```ini
[default]
region = ru-central1
endpoint_url = https://storage.yandexcloud.net
```

---

## Аутентификация

### Способ 1: Явная передача ключей (рекомендуется)

```python
import boto3

session = boto3.session.Session()
s3 = session.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id='YOUR_ACCESS_KEY_ID',
    aws_secret_access_key='YOUR_SECRET_ACCESS_KEY',
    region_name='ru-central1'
)
```

### Способ 2: Использование credentials из ~/.aws/

```python
import boto3

session = boto3.session.Session()
s3 = session.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net'
)
```

### Способ 3: Переменные окружения

```bash
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_ACCESS_KEY"
```

```python
import boto3

s3 = boto3.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net'
)
```

---

## Основные операции

### 1. Создание бакета

```python
s3.create_bucket(Bucket='my-bucket-name')
```

### 2. Получение списка бакетов

```python
response = s3.list_buckets()
for bucket in response['Buckets']:
    print(f"Бакет: {bucket['Name']}")
```

### 3. Загрузка файла

#### Из локального файла
```python
s3.upload_file('local_file.jpg', 'bucket-name', 'remote_file.jpg')
```

#### Из строки/байтов
```python
s3.put_object(
    Bucket='bucket-name',
    Key='object_name.txt',
    Body='Текстовое содержимое',
    StorageClass='STANDARD'  # или 'COLD' для холодного хранения
)
```

### 4. Получение списка объектов

#### Простой список
```python
response = s3.list_objects_v2(Bucket='bucket-name')

if 'Contents' in response:
    for obj in response['Contents']:
        print(f"Ключ: {obj['Key']}, Размер: {obj['Size']} bytes")
```

#### С пагинацией (для большого количества объектов)
```python
paginator = s3.get_paginator('list_objects_v2')

for page in paginator.paginate(Bucket='bucket-name'):
    if 'Contents' in page:
        for obj in page['Contents']:
            print(f"Ключ: {obj['Key']}")
```

#### С фильтрацией по префиксу
```python
response = s3.list_objects_v2(
    Bucket='bucket-name',
    Prefix='images/',  # только файлы в папке images/
    MaxKeys=100        # максимум 100 объектов
)
```

### 5. Скачивание файла

#### В локальный файл
```python
s3.download_file('bucket-name', 'remote_file.jpg', 'local_file.jpg')
```

#### Получение содержимого в память
```python
response = s3.get_object(Bucket='bucket-name', Key='file.txt')
content = response['Body'].read()
print(content.decode('utf-8'))
```

### 6. Удаление объектов

#### Удаление одного объекта
```python
s3.delete_object(Bucket='bucket-name', Key='file.jpg')
```

#### Удаление нескольких объектов
```python
objects_to_delete = [
    {'Key': 'file1.jpg'},
    {'Key': 'file2.jpg'},
    {'Key': 'folder/file3.jpg'}
]

response = s3.delete_objects(
    Bucket='bucket-name',
    Delete={'Objects': objects_to_delete}
)
```

### 7. Проверка существования объекта

```python
try:
    s3.head_object(Bucket='bucket-name', Key='file.jpg')
    print("Объект существует")
except s3.exceptions.NoSuchKey:
    print("Объект не найден")
```

### 8. Получение метаданных объекта

```python
response = s3.head_object(Bucket='bucket-name', Key='file.jpg')
print(f"Размер: {response['ContentLength']} bytes")
print(f"Тип: {response['ContentType']}")
print(f"Последнее изменение: {response['LastModified']}")
```

### 9. Копирование объекта

```python
copy_source = {
    'Bucket': 'source-bucket',
    'Key': 'source-file.jpg'
}

s3.copy_object(
    CopySource=copy_source,
    Bucket='destination-bucket',
    Key='destination-file.jpg'
)
```

### 10. Получение публичной ссылки (presigned URL)

```python
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'bucket-name', 'Key': 'file.jpg'},
    ExpiresIn=3600  # ссылка действительна 1 час
)
print(f"Публичная ссылка: {url}")
```

---

## Примеры использования

### Пример 1: Массовая загрузка файлов из директории

```python
import os
import boto3

def upload_directory(local_directory, bucket_name, s3_prefix=''):
    """
    Загружает все файлы из локальной директории в бакет
    """
    session = boto3.session.Session()
    s3 = session.client(
        service_name='s3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id='YOUR_KEY_ID',
        aws_secret_access_key='YOUR_SECRET_KEY',
        region_name='ru-central1'
    )
    
    uploaded = 0
    errors = 0
    
    for root, dirs, files in os.walk(local_directory):
        for filename in files:
            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, local_directory)
            s3_key = os.path.join(s3_prefix, relative_path).replace('\\', '/')
            
            try:
                s3.upload_file(local_path, bucket_name, s3_key)
                print(f"✓ Загружен: {s3_key}")
                uploaded += 1
            except Exception as e:
                print(f"✗ Ошибка при загрузке {filename}: {e}")
                errors += 1
    
    print(f"\nЗагружено: {uploaded}, Ошибок: {errors}")

# Использование
upload_directory('/path/to/local/folder', 'my-bucket', 'uploads/')
```

### Пример 2: Загрузка с проверкой на дубликаты

```python
import boto3
import os

def upload_if_not_exists(local_file, bucket_name, s3_key):
    """
    Загружает файл только если он не существует в бакете
    """
    s3 = boto3.client(
        service_name='s3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id='YOUR_KEY_ID',
        aws_secret_access_key='YOUR_SECRET_KEY'
    )
    
    try:
        # Проверяем существование объекта
        s3.head_object(Bucket=bucket_name, Key=s3_key)
        print(f"⊙ Файл {s3_key} уже существует, пропускаем")
        return False
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            # Файл не существует, загружаем
            s3.upload_file(local_file, bucket_name, s3_key)
            print(f"✓ Загружен: {s3_key}")
            return True
        else:
            raise

# Использование
upload_if_not_exists('local.jpg', 'my-bucket', 'remote.jpg')
```

### Пример 3: Скачивание всех файлов из бакета

```python
import boto3
import os

def download_all_objects(bucket_name, local_directory):
    """
    Скачивает все объекты из бакета в локальную директорию
    """
    s3 = boto3.client(
        service_name='s3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id='YOUR_KEY_ID',
        aws_secret_access_key='YOUR_SECRET_KEY'
    )
    
    paginator = s3.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' not in page:
            print("Бакет пуст")
            return
        
        for obj in page['Contents']:
            s3_key = obj['Key']
            local_path = os.path.join(local_directory, s3_key)
            
            # Создаём директории при необходимости
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            try:
                s3.download_file(bucket_name, s3_key, local_path)
                print(f"✓ Скачан: {s3_key}")
            except Exception as e:
                print(f"✗ Ошибка при скачивании {s3_key}: {e}")

# Использование
download_all_objects('my-bucket', '/path/to/download/folder')
```

### Пример 4: Поиск файлов по расширению

```python
import boto3

def find_files_by_extension(bucket_name, extension):
    """
    Находит все файлы с заданным расширением в бакете
    """
    s3 = boto3.client(
        service_name='s3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id='YOUR_KEY_ID',
        aws_secret_access_key='YOUR_SECRET_KEY'
    )
    
    paginator = s3.get_paginator('list_objects_v2')
    matching_files = []
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' in page:
            for obj in page['Contents']:
                if obj['Key'].endswith(extension):
                    matching_files.append(obj['Key'])
    
    return matching_files

# Использование
jpg_files = find_files_by_extension('my-bucket', '.jpg')
print(f"Найдено JPG файлов: {len(jpg_files)}")
for file in jpg_files[:10]:  # Показываем первые 10
    print(f"  - {file}")
```

### Пример 5: Получение статистики по бакету

```python
import boto3

def get_bucket_statistics(bucket_name):
    """
    Получает статистику по бакету: количество файлов, общий размер
    """
    s3 = boto3.client(
        service_name='s3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id='YOUR_KEY_ID',
        aws_secret_access_key='YOUR_SECRET_KEY'
    )
    
    paginator = s3.get_paginator('list_objects_v2')
    
    total_size = 0
    total_files = 0
    file_types = {}
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' in page:
            for obj in page['Contents']:
                total_files += 1
                total_size += obj['Size']
                
                # Подсчёт по типам файлов
                ext = obj['Key'].split('.')[-1].lower()
                file_types[ext] = file_types.get(ext, 0) + 1
    
    print(f"Статистика бакета '{bucket_name}':")
    print(f"  Всего файлов: {total_files}")
    print(f"  Общий размер: {total_size / (1024**3):.2f} GB")
    print(f"\nРаспределение по типам файлов:")
    for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True):
        print(f"  .{ext}: {count}")

# Использование
get_bucket_statistics('my-bucket')
```

---

## Обработка ошибок

### Основные исключения

```python
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

s3 = boto3.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id='YOUR_KEY_ID',
    aws_secret_access_key='YOUR_SECRET_KEY'
)

try:
    response = s3.get_object(Bucket='my-bucket', Key='file.txt')
    
except NoCredentialsError:
    print("Ошибка: Не найдены учётные данные")
    
except ClientError as e:
    error_code = e.response['Error']['Code']
    
    if error_code == 'NoSuchBucket':
        print("Ошибка: Бакет не существует")
    elif error_code == 'NoSuchKey':
        print("Ошибка: Объект не найден")
    elif error_code == 'AccessDenied':
        print("Ошибка: Доступ запрещён")
    else:
        print(f"Ошибка: {e}")
        
except Exception as e:
    print(f"Неожиданная ошибка: {e}")
```

### Повторные попытки при ошибках сети

```python
from botocore.config import Config
import boto3

# Настройка повторных попыток
config = Config(
    retries={
        'max_attempts': 10,
        'mode': 'adaptive'
    }
)

s3 = boto3.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id='YOUR_KEY_ID',
    aws_secret_access_key='YOUR_SECRET_KEY',
    config=config
)
```

---

## Полезные советы

### 1. Использование пагинации для больших бакетов

Всегда используйте пагинацию при работе с большим количеством объектов:

```python
paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket='bucket-name'):
    # обработка объектов
    pass
```

### 2. Оптимизация загрузки больших файлов

Для файлов > 100 MB используйте multipart upload:

```python
# boto3 автоматически использует multipart для больших файлов
s3.upload_file('large_file.bin', 'bucket-name', 'large_file.bin')
```

### 3. Установка типа контента

```python
s3.upload_file(
    'image.jpg',
    'bucket-name',
    'image.jpg',
    ExtraArgs={'ContentType': 'image/jpeg'}
)
```

### 4. Классы хранения

```python
# STANDARD - стандартное хранение (быстрый доступ)
# COLD - холодное хранение (дешевле, медленнее)

s3.put_object(
    Bucket='bucket-name',
    Key='archive.zip',
    Body=data,
    StorageClass='COLD'
)
```

---

## Полезные ссылки

- [Официальная документация Yandex Cloud Object Storage](https://yandex.cloud/ru/docs/storage/)
- [Документация boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Работа с boto3 в Yandex Cloud](https://yandex.cloud/ru/docs/storage/tools/boto)
- [S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)

---

## Лицензия и поддержка

При возникновении проблем:
1. Проверьте правильность ключей доступа
2. Убедитесь, что у сервисного аккаунта есть необходимые права
3. Проверьте название бакета (должно быть уникальным)
4. Обратитесь к логам для получения подробной информации об ошибках

---

*Документ создан: 20 декабря 2025*
*Версия: 1.0*

