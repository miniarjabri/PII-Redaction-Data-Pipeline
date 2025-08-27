''' 
requirements:
wget https://github.com/noc-lab/simple_sentence_segment/releases/download/0.1.2/simple_sentence_segment-0.1.2.tar.gz
pip install simple_sentence_segment-0.1.2.tar.gz

usage: 
python segment.py --input_file <input> --output_file <output> --segment_length <max segment length>

input:
any text file

output:
A json file containing "sentences" and "segments"

The script breaks input file into sentences and segments. 
Sentences are meant to resemble regular sentences, none of which will be larger than segment_length.
Segments will be segments of the input file. They consists of one of multiple full sentences. Length of each segment will be smaller but as close as possible to the segment-length.

Example:

== input: ==
Admission Date:  1-1-01      
Discharge Date:  1-1-01
Date of Birth: 1-1-01  
Sex: F

HISTORY OF PRESENT ILLNESS: Lorem ipsum dolor sit amet, consectetuer 
adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum 
sociis natoque penatibus et magnis dis parturient montes, nascetur
ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, 
pretium quis, sem.
 
Nulla consequat massa quis enim. Donec pede justo, fringilla vel,
aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet 
a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. 

Summary:

1. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus.
 
2. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. 

3. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. 

== sentences: ==
"Admission Date:  1-1-01      \n"
"Discharge Date:  1-1-01\n"
"Date of Birth:"
" 1-1-01  \n"
"Sex: F\n"
"HISTORY OF PRESENT ILLNESS: Lorem ipsum dolor sit amet, consectetuer \nadipiscing elit."
" Aenean commodo ligula eget dolor."
" Aenean massa."
" Cum \nsociis natoque penatibus et magnis dis parturient montes, nascetur\nridiculus mus."
" Donec quam felis, ultricies nec, pellentesque eu, \npretium quis, sem."
"Nulla consequat massa quis enim."
" Donec pede justo, fringilla vel,\naliquet nec, vulputate eget, arcu."
" In enim justo, rhoncus ut, imperdiet \na, venenatis vitae, justo."
" Nullam dictum felis eu pede mollis pretium."
"Summary:"
"1."
" Integer tincidunt."
" Cras dapibus."
" Vivamus elementum semper nisi."
" Aenean vulputate eleifend tellus."
"2."
" Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim."
"3."
" Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus."

== segments: ==
Admission Date:  1-1-01      \nDischarge Date:  1-1-01\nDate of Birth: 1-1-01  \nSex: F\n\nHISTORY OF PRESENT ILLNESS: Lorem ipsum dolor sit amet, consectetuer \nadipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum \nsociis natoque penatibus et magnis dis parturient montes, nascetur\nridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, \npretium quis, sem.\n \nNulla consequat massa quis enim. Donec pede justo, fringilla vel,\naliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet \na, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. \n\nSummary:\n\n1. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus.\n \n2. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. \n\n3. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus.\n

'''

import json
import argparse
import scispacy
import spacy
from simple_sentence_segment import sentence_segment

def break_sentence(s,seg_len):
    segments = []
    points = list(range(0,len(s),seg_len))   
    if points[-1] != len(s): points.append(len(s))
    for i in range(len(points)-1):
        segments.append(s[points[i]:points[i+1]])    
    return segments

def process(ifp, ofp, seg_len):
    text = ifp.read()
    
    #get sentences
    init_sentences = list()
    for s, t in sentence_segment(text):
        init_sentences.append(text[s:t])
 
    #break large sentences
    sentences = list()
    for i,s in enumerate(init_sentences):
        if len(s) > seg_len: sentences += break_sentence(s,seg_len)
        else: sentences.append(s)

    #create segments
    segments = []
    segment = ""
    # add sentences until adding the next one makes the segment too long
    # then store the segment and start with a new one
    for s in sentences:
        if len(segment) + len(s) > seg_len:
            segments.append(segment)
            segment = ""
        segment = segment + s
    segments.append(segment)
 
    data = dict()
    data["sentences"] = sentences
    data["segments"] = segments
    json.dump(data,ofp)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input_file',
                        default='',
                        type=str)
    parser.add_argument('--output_file',
                        default='',
                        type=str)
    parser.add_argument('--segment_length',
                        default=20000,
                        type=int)

    args = parser.parse_args()

    ifp = open(args.input_file, 'r')
    ofp = open(args.output_file, 'w+')
    
    process(ifp, ofp, args.segment_length)
    
    ifp.close()
    ofp.close()

if __name__ == '__main__':
    main()

