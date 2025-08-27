FROM public.ecr.aws/lambda/python:3.9-x86_64

# Install required system dependencies for PyMuPDF and ImageMagick
RUN yum install -y ImageMagick \
                   ImageMagick-devel \
                   mupdf \
                   freetype-devel \
                   zlib-devel \
                   libjpeg-devel \
                   wget \
                   git


COPY *.py ${LAMBDA_TASK_ROOT}/

COPY requirements.txt  .
RUN  pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

